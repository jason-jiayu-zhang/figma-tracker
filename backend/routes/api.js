const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const supabase = require("../supabaseClient");
const { getSessionUser } = supabase;
const { runSync, runPageSync, runSyncAfterDelay } = require("../syncService");

const DEFAULT_TZ = "America/Los_Angeles";

/** Constant-time string comparison (avoids leaking the secret via timing). */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Protect the cron-triggered sync endpoints. Works on any host:
//   - If CRON_SECRET is set, require `Authorization: Bearer <secret>` (or ?key=).
//     This is what an external scheduler (cron-job.org, GitHub Actions) uses.
//   - Else, on Vercel, fall back to the injected `x-vercel-cron` header.
//   - Else (local dev, no secret), allow — but warn, since it's unprotected.
function protectCron(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers["authorization"] || "";
    const provided = auth.startsWith("Bearer ")
      ? auth.slice(7)
      : req.query.key || "";
    if (provided && safeEqual(provided, secret)) return next();
    console.warn("[auth] Unauthorized cron attempt (bad/missing secret)");
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (process.env.VERCEL) {
    const cronHeader = req.headers["x-vercel-cron"];
    if (!cronHeader) {
      console.warn("[auth] Unauthorized cron attempt (missing header)");
      return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  }
  console.warn("[auth] Cron endpoint hit with no CRON_SECRET set — UNPROTECTED");
  next();
}

// ============================================================
// Helpers
// ============================================================

function makeDateFormatter(tz) {
  try {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    // sanity-format to trigger a throw on invalid tz
    f.format(new Date());
    return f;
  } catch (e) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TZ });
  }
}

/** File ids owned by a user. */
async function getOwnerFileIds(ownerId) {
  const { data } = await supabase
    .from("figma_files")
    .select("id")
    .eq("owner_user_id", ownerId);
  return (data || []).map((f) => f.id);
}

/** Paginate all rows of a file_versions query (avoids the 1000-row cap). */
async function paginateVersions(buildQuery) {
  const PAGE_SIZE = 1000;
  let page = 0;
  let all = [];
  while (true) {
    const { data, error } = await buildQuery().range(
      page * PAGE_SIZE,
      (page + 1) * PAGE_SIZE - 1,
    );
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

/**
 * Stats for a user's owned files.
 * @param user { id, figma_user_id }
 * @param mode "all" | "individual"
 */
async function computeStats(user, mode) {
  const fileIds = await getOwnerFileIds(user.id);
  const individual = mode === "individual";

  const base = {
    filesTracked: fileIds.length,
    totalVersions: 0,
    editsToday: 0,
    lastSync: null,
    lastSyncStatus: null,
    mode,
  };

  // last sync (global audit log)
  const { data: sess } = await supabase
    .from("sync_sessions")
    .select("synced_at, status")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  base.lastSync = sess ? sess.synced_at : null;
  base.lastSyncStatus = sess ? sess.status : null;

  if (fileIds.length === 0) return base;

  // total versions
  let totalQ = supabase
    .from("file_versions")
    .select("id", { count: "exact", head: true })
    .in("file_id", fileIds);
  if (individual) totalQ = totalQ.eq("created_by_figma_user_id", user.figma_user_id);
  const { count: totalCount } = await totalQ;
  base.totalVersions = totalCount || 0;

  // edits today (bucketed in the default tz)
  const fmt = makeDateFormatter(DEFAULT_TZ);
  const todayStr = fmt.format(new Date());
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  let recent = await paginateVersions(() => {
    let q = supabase
      .from("file_versions")
      .select("created_at")
      .in("file_id", fileIds)
      .gte("created_at", since);
    if (individual) q = q.eq("created_by_figma_user_id", user.figma_user_id);
    return q;
  });
  base.editsToday = recent.filter(
    (v) => fmt.format(new Date(v.created_at)) === todayStr,
  ).length;

  return base;
}

/**
 * Files list for a user's owned files with version counts.
 */
async function computeFiles(user, mode) {
  const individual = mode === "individual";

  const { data: files, error } = await supabase
    .from("figma_files")
    .select(
      `id, file_key, name, thumbnail_url, last_modified, updated_at, project_name,
       teams ( name )`,
    )
    .eq("owner_user_id", user.id)
    .order("last_modified", { ascending: false });
  if (error) throw error;

  const fileIds = (files || []).map((f) => f.id);
  const countMap = {};
  if (fileIds.length > 0) {
    const counts = await paginateVersions(() => {
      let q = supabase
        .from("file_versions")
        .select("file_id, created_by_figma_user_id")
        .in("file_id", fileIds);
      if (individual) q = q.eq("created_by_figma_user_id", user.figma_user_id);
      return q;
    });
    for (const r of counts) {
      countMap[r.file_id] = (countMap[r.file_id] || 0) + 1;
    }
  }

  return (files || []).map((f) => ({
    ...f,
    teamName: f.teams ? f.teams.name : null,
    versionCount: countMap[f.id] || 0,
  }));
}

/**
 * Activity (daily edit counts) for a user's owned files, bucketed in `tz`.
 */
async function computeActivity(user, { days, mode, tz, fileKeys }) {
  const individual = mode === "individual";
  const fmt = makeDateFormatter(tz);

  // Resolve target file ids (owned by user), optionally narrowed by fileKeys.
  let targetIds = [];
  if (fileKeys && fileKeys.length > 0) {
    const { data: fileRows, error } = await supabase
      .from("figma_files")
      .select("id")
      .eq("owner_user_id", user.id)
      .in("file_key", fileKeys);
    if (error) throw error;
    targetIds = (fileRows || []).map((r) => r.id);
  } else {
    targetIds = await getOwnerFileIds(user.id);
  }

  if (targetIds.length === 0) {
    return { rows: [], dailyTotals: {}, totalEdits: 0, days, mode, tz };
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const versions = await paginateVersions(() => {
    let q = supabase
      .from("file_versions")
      .select("created_at, file_id, figma_files!inner( file_key, name )")
      .in("file_id", targetIds)
      .gte("created_at", sinceStr + "T00:00:00.000Z");
    if (individual) q = q.eq("created_by_figma_user_id", user.figma_user_id);
    return q;
  });

  // Group by (tz date, file)
  const grouped = {};
  for (const v of versions) {
    const date = fmt.format(new Date(v.created_at)); // YYYY-MM-DD in tz
    const key = `${date}__${v.file_id}`;
    if (!grouped[key]) {
      grouped[key] = {
        activity_date: date,
        version_count: 0,
        figma_files: v.figma_files,
      };
    }
    grouped[key].version_count++;
  }
  const rows = Object.values(grouped).sort((a, b) =>
    b.activity_date.localeCompare(a.activity_date),
  );

  const dailyTotals = {};
  let totalEdits = 0;
  for (const r of rows) {
    dailyTotals[r.activity_date] =
      (dailyTotals[r.activity_date] || 0) + r.version_count;
    totalEdits += r.version_count;
  }

  return { rows, dailyTotals, totalEdits, days, mode, tz };
}

/** Resolve a public profile slug → user, gated on public_enabled. */
async function resolvePublicUser(slug) {
  const { data, error } = await supabase
    .from("users")
    .select("id, figma_user_id, public_enabled")
    .eq("profile_slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.public_enabled) return null;
  return { id: data.id, figma_user_id: data.figma_user_id };
}

function parseMode(req) {
  return req.query.mode === "individual" ? "individual" : "all";
}

function parseFileKeys(req) {
  let fileKeys = req.query.fileKeys || req.query.fileKey;
  if (fileKeys && !Array.isArray(fileKeys)) fileKeys = fileKeys.split(",");
  return (fileKeys || []).filter(Boolean);
}

// ============================================================
// Sync trigger routes
// ============================================================

// POST /api/webhook — triggered by Figma
router.post("/webhook", async (req, res) => {
  console.log("[webhook] Received Figma notification");
  runSyncAfterDelay(30000);
  res.status(200).send("OK");
});

// POST or GET /api/sync — trigger a manual full sync
router.all("/sync", protectCron, async (req, res) => {
  try {
    const result = await runSync();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/sync/incremental — trigger a page sync (for cron)
router.get("/sync/incremental", protectCron, async (req, res) => {
  try {
    const updateFound = await runPageSync();
    res.json({ ok: true, updateFound });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// Session-scoped data routes
// ============================================================

// GET /api/stats?scope=mine&mode=all|individual
router.get("/stats", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const stats = await computeStats(session, parseMode(req));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files?mode=all|individual
router.get("/files", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const files = await computeFiles(session, parseMode(req));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity?days=&mode=all|individual&tz=<IANA>&fileKeys=
router.get("/activity", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const days = parseInt(req.query.days) || 365;
    const tz = req.query.tz || DEFAULT_TZ;
    const result = await computeActivity(session, {
      days,
      mode: parseMode(req),
      tz,
      fileKeys: parseFileKeys(req),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/versions/:fileKey — version timeline for a session-owned file
router.get("/versions/:fileKey", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const { fileKey } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const mode = parseMode(req);

    const { data: fileRow, error: fErr } = await supabase
      .from("figma_files")
      .select("id, name")
      .eq("owner_user_id", session.id)
      .eq("file_key", fileKey)
      .maybeSingle();

    if (fErr || !fileRow) {
      return res.status(404).json({ error: "File not found." });
    }

    let query = supabase
      .from("file_versions")
      .select(
        "version_id, label, description, created_at, created_by_handle, created_by_figma_user_id",
      )
      .eq("file_id", fileRow.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (mode === "individual")
      query = query.eq("created_by_figma_user_id", session.figma_user_id);

    const { data: versions, error: vErr } = await query;
    if (vErr) return res.status(500).json({ error: vErr.message });

    res.json({ fileName: fileRow.name, fileKey, mode, versions: versions || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUBLIC profile routes (no cookie; gated on public_enabled)
// ============================================================

router.get("/public/:slug/stats", async (req, res) => {
  try {
    const user = await resolvePublicUser(req.params.slug);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    const stats = await computeStats(user, parseMode(req));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/public/:slug/files", async (req, res) => {
  try {
    const user = await resolvePublicUser(req.params.slug);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    const files = await computeFiles(user, parseMode(req));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/public/:slug/activity", async (req, res) => {
  try {
    const user = await resolvePublicUser(req.params.slug);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    const days = parseInt(req.query.days) || 365;
    const tz = req.query.tz || DEFAULT_TZ;
    const result = await computeActivity(user, {
      days,
      mode: parseMode(req),
      tz,
      fileKeys: parseFileKeys(req),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Misc
// ============================================================

// GET /api/sync-history — last 20 sync sessions
router.get("/sync-history", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sync_sessions")
      .select("*")
      .order("synced_at", { ascending: false })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
