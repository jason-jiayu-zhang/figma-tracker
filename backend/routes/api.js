const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const supabase = require("../supabaseClient");
const { getSessionUser } = supabase;
const { runSync, runPageSync, runSyncAfterDelay } = require("../syncService");
const { computeStreaks } = require("../lib/streaks");
const { URBANIST_700_WOFF2_B64, URBANIST_500_WOFF2_B64 } = require("../badgeFont");

const DEFAULT_TZ = "America/Los_Angeles";

/** Constant-time string comparison (avoids leaking the secret via timing). */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Protect the cron-triggered sync endpoints. Requires CRON_SECRET via
// `Authorization: Bearer <secret>` (or ?key=), which is what an external
// scheduler sends. With no secret configured there is nothing to check, and
// /api/sync burns the app's Figma quota, so an unset secret rejects rather
// than opening the endpoint.
function protectCron(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[auth] Cron endpoint rejected — CRON_SECRET is not set");
    return res.status(401).json({ error: "Unauthorized" });
  }
  const auth = req.headers["authorization"] || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : req.query.key || "";
  if (provided && safeEqual(provided, secret)) return next();
  console.warn("[auth] Unauthorized cron attempt (bad/missing secret)");
  return res.status(401).json({ error: "Unauthorized" });
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

/** Restrict a figma_files query to active (non-archived) files. Routing every
   aggregation through this keeps "active only" the default and prevents a new
   query from silently counting archived files. */
const activeFiles = (q) => q.is("archived_at", null);

/** File ids owned by a user (archived files excluded from all aggregations). */
async function getOwnerFileIds(ownerId) {
  const { data } = await activeFiles(
    supabase.from("figma_files").select("id").eq("owner_user_id", ownerId),
  );
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
 * Archived files are excluded unless `includeArchived` (the Files page needs
 * them to render its "Archived" section with an un-archive action).
 */
async function computeFiles(user, mode, includeArchived = false) {
  const individual = mode === "individual";

  let filesQ = supabase
    .from("figma_files")
    .select(
      `id, file_key, name, thumbnail_url, last_modified, updated_at, project_name, archived_at,
       teams ( name )`,
    )
    .eq("owner_user_id", user.id)
    .order("last_modified", { ascending: false });
  if (!includeArchived) filesQ = activeFiles(filesQ);
  const { data: files, error } = await filesQ;
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
    const { data: fileRows, error } = await activeFiles(
      supabase
        .from("figma_files")
        .select("id")
        .eq("owner_user_id", user.id)
        .in("file_key", fileKeys),
    );
    if (error) throw error;
    targetIds = (fileRows || []).map((r) => r.id);
  } else {
    targetIds = await getOwnerFileIds(user.id);
  }

  if (targetIds.length === 0) {
    return { rows: [], files: [], dailyTotals: {}, totalEdits: 0, days, mode, tz };
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const versions = await paginateVersions(() => {
    let q = supabase
      .from("file_versions")
      .select("created_at, file_id, figma_files!inner( file_key, name, last_modified )")
      .in("file_id", targetIds)
      .gte("created_at", sinceStr + "T00:00:00.000Z");
    if (individual) q = q.eq("created_by_figma_user_id", user.figma_user_id);
    return q;
  });

  // Group by (tz date, file); rows carry {file_key, name} for the breakdown.
  const grouped = {};
  const filesMap = {};
  for (const v of versions) {
    const ff = v.figma_files;
    const date = fmt.format(new Date(v.created_at)); // YYYY-MM-DD in tz
    const key = `${date}__${v.file_id}`;
    if (!grouped[key]) {
      grouped[key] = {
        activity_date: date,
        version_count: 0,
        figma_files: ff ? { file_key: ff.file_key, name: ff.name } : null,
      };
    }
    grouped[key].version_count++;
    if (ff && !filesMap[ff.file_key]) {
      filesMap[ff.file_key] = {
        file_key: ff.file_key,
        name: ff.name,
        last_modified: ff.last_modified,
      };
    }
  }
  const rows = Object.values(grouped).sort((a, b) =>
    b.activity_date.localeCompare(a.activity_date),
  );
  const files = Object.values(filesMap);

  const dailyTotals = {};
  let totalEdits = 0;
  for (const r of rows) {
    dailyTotals[r.activity_date] =
      (dailyTotals[r.activity_date] || 0) + r.version_count;
    totalEdits += r.version_count;
  }

  return { rows, files, dailyTotals, totalEdits, days, mode, tz };
}

/** Resolve target file ids for a user, optionally narrowed by file keys. */
async function resolveTargetFileIds(user, fileKeys) {
  if (fileKeys && fileKeys.length > 0) {
    const { data, error } = await activeFiles(
      supabase
        .from("figma_files")
        .select("id")
        .eq("owner_user_id", user.id)
        .in("file_key", fileKeys),
    );
    if (error) throw error;
    return (data || []).map((r) => r.id);
  }
  return getOwnerFileIds(user.id);
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Derived analytics from stored version + comment + dev-resource data.
 * Everything here is computed from data already synced — no live Figma calls.
 */
async function computeInsights(user, { mode, tz, fileKeys }) {
  const individual = mode === "individual";
  const dateFmt = makeDateFormatter(tz);
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hourCycle: "h23",
  });
  const wdFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });

  const targetIds = await resolveTargetFileIds(user, fileKeys);

  const empty = {
    mode,
    tz,
    streak: { current: 0, longest: 0 },
    named: { named: 0, total: 0, pct: 0 },
    documented: { documented: 0, total: 0, pct: 0 },
    byHour: Array(24).fill(0),
    byWeekday: Array(7).fill(0),
    busiestHour: null,
    busiestWeekday: null,
    velocity: { last7: 0, prev7: 0, last30: 0, prev30: 0 },
    comments: { total: 0, unresolved: 0, resolvedPct: 0, last30: 0 },
    devResources: { total: 0 },
  };
  if (targetIds.length === 0) return empty;

  // -- Versions (all history for streaks/velocity/patterns) --
  const versions = await paginateVersions(() => {
    let q = supabase
      .from("file_versions")
      .select("created_at, label, description")
      .in("file_id", targetIds);
    if (individual) q = q.eq("created_by_figma_user_id", user.figma_user_id);
    return q;
  });

  const byHour = Array(24).fill(0);
  const byWeekday = Array(7).fill(0);
  const activeDates = new Set();
  let named = 0;
  let documented = 0;
  const now = Date.now();
  const vel = { last7: 0, prev7: 0, last30: 0, prev30: 0 };

  for (const v of versions) {
    const d = new Date(v.created_at);
    activeDates.add(dateFmt.format(d));
    byHour[parseInt(hourFmt.format(d), 10) % 24]++;
    const wd = WEEKDAY_INDEX[wdFmt.format(d)];
    if (wd !== undefined) byWeekday[wd]++;
    if (v.label) named++;
    if (v.description) documented++;

    const ageDays = (now - d.getTime()) / 86400000;
    if (ageDays < 7) vel.last7++;
    else if (ageDays < 14) vel.prev7++;
    if (ageDays < 30) vel.last30++;
    else if (ageDays < 60) vel.prev30++;
  }

  const total = versions.length;
  const todayStr = dateFmt.format(new Date());
  const streak = computeStreaks(activeDates, todayStr);

  const maxIdx = (arr) => {
    let bi = -1;
    let bv = 0;
    arr.forEach((v, i) => {
      if (v > bv) {
        bv = v;
        bi = i;
      }
    });
    return bi;
  };

  // -- Comments summary (Tier-2: tolerate the table not existing yet so the
  //    Tier-1 stats above always render) --
  const thirtyAgo = now - 30 * 86400000;
  let unresolved = 0;
  let last30Comments = 0;
  let commentTotal = 0;
  try {
    const comments = await paginateVersions(() => {
      let q = supabase
        .from("file_comments")
        .select("created_at, resolved_at")
        .in("file_id", targetIds);
      if (individual) q = q.eq("author_figma_user_id", user.figma_user_id);
      return q;
    });
    for (const c of comments) {
      if (!c.resolved_at) unresolved++;
      if (new Date(c.created_at).getTime() >= thirtyAgo) last30Comments++;
    }
    commentTotal = comments.length;
  } catch (e) {
    console.warn("[insights] comments unavailable (run migration?):", e.message);
  }

  // -- Dev resources (current count; not author-scoped) --
  let devCount = 0;
  try {
    const { count } = await supabase
      .from("dev_resources")
      .select("id", { count: "exact", head: true })
      .in("file_id", targetIds);
    devCount = count || 0;
  } catch (e) {
    console.warn("[insights] dev_resources unavailable (run migration?):", e.message);
  }

  return {
    mode,
    tz,
    streak,
    named: { named, total, pct: total ? Math.round((named / total) * 100) : 0 },
    documented: {
      documented,
      total,
      pct: total ? Math.round((documented / total) * 100) : 0,
    },
    byHour,
    byWeekday,
    busiestHour: total ? maxIdx(byHour) : null,
    busiestWeekday: total ? maxIdx(byWeekday) : null,
    velocity: vel,
    comments: {
      total: commentTotal,
      unresolved,
      resolvedPct: commentTotal
        ? Math.round(((commentTotal - unresolved) / commentTotal) * 100)
        : 0,
      last30: last30Comments,
    },
    devResources: { total: devCount || 0 },
  };
}

/** Resolve a public profile slug → user, gated on public_enabled. */
async function resolvePublicUser(slug) {
  const { data, error } = await supabase
    .from("users")
    .select("id, figma_user_id, public_enabled, handle, display_name, img_url")
    .eq("profile_slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.public_enabled) return null;
  return {
    id: data.id,
    figma_user_id: data.figma_user_id,
    handle: data.handle || data.display_name || null,
    img_url: data.img_url || null,
  };
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

const WEBHOOK_SYNC_DELAY_MS = 30000;
let webhookSyncScheduledUntil = 0;

// POST /api/webhook — triggered by Figma.
// Webhooks v2 echoes back the passcode chosen at subscription time; it's the
// only credential the delivery carries, so it must match FIGMA_WEBHOOK_PASSCODE.
router.post("/webhook", (req, res) => {
  const expected = process.env.FIGMA_WEBHOOK_PASSCODE;
  const provided = req.body && req.body.passcode;
  if (!expected || typeof provided !== "string" || !safeEqual(provided, expected)) {
    console.warn("[webhook] Rejected delivery (bad/missing passcode)");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // runSyncAfterDelay schedules an independent full sync per call, so a burst
  // of deliveries (Figma fans out one per file event) would stack syncs.
  // Collapse anything arriving before the pending sync fires into that sync.
  const now = Date.now();
  if (now >= webhookSyncScheduledUntil) {
    webhookSyncScheduledUntil = now + WEBHOOK_SYNC_DELAY_MS;
    runSyncAfterDelay(WEBHOOK_SYNC_DELAY_MS);
    console.log("[webhook] Notification accepted — sync scheduled");
  }
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

// POST /api/sync/manual — user-triggered "Sync now" from the dashboard.
// Session-authenticated (a logged-in browser), NOT cron-protected: the client
// can't hold CRON_SECRET, so it must never hit /api/sync (which returns 401).
router.post("/sync/manual", async (req, res) => {
  const session = getSessionUser(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  try {
    const result = await runSync();
    res.json({ ok: true, ...result });
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

// GET /api/files?mode=all|individual&includeArchived=1
router.get("/files", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const includeArchived =
      req.query.includeArchived === "1" || req.query.includeArchived === "true";
    const files = await computeFiles(session, parseMode(req), includeArchived);
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

// GET /api/insights?mode=all|individual&tz=<IANA>&fileKeys=
router.get("/insights", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const result = await computeInsights(session, {
      mode: parseMode(req),
      tz: req.query.tz || DEFAULT_TZ,
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
    res.json({ ...stats, handle: user.handle, img_url: user.img_url });
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

router.get("/public/:slug/insights", async (req, res) => {
  try {
    const user = await resolvePublicUser(req.params.slug);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    const result = await computeInsights(user, {
      mode: parseMode(req),
      tz: req.query.tz || DEFAULT_TZ,
      fileKeys: parseFileKeys(req),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]),
  );
}

/** Validate a bare hex color param (no `#`, e.g. `bg=fffaf4`) and re-add `#`.
 *  Returns null for anything invalid so callers fall back to the theme preset.
 *  Regex-gated so only `#[0-9a-fA-F]{3,8}` ever reaches the SVG. */
function parseHexParam(v) {
  return typeof v === "string" && /^[0-9a-fA-F]{3,8}$/.test(v) ? "#" + v : null;
}

/** A droppable streak badge (SVG) styled to match the dashboard's light,
 *  soft-card look: cream/ink surface, hairline border, accent flame. */
function buildBadgeSvg({ metric, value, theme, emoji, colors = {}, radius }) {
  const isDark = theme === "dark";
  // Dashboard design tokens (src/index.css @theme) as the base preset;
  // explicit color params (already validated + `#`-prefixed) override per token.
  const preset = isDark
    ? { accent: "#f23b27", surface: "#1f1f1f", border: "rgba(255,255,255,0.10)", ink: "#f5f5f5", muted: "#a6a6a6" }
    : { accent: "#f23b27", surface: "#fffaf4", border: "#ebebeb", ink: "#1a1a1a", muted: "#737373" };
  const accent = colors.accent || preset.accent;
  const surface = colors.bg || preset.surface; // canvas cream / dark ink
  const border = colors.border || preset.border; // line
  const ink = colors.ink || preset.ink;
  const muted = colors.muted || preset.muted; // body

  const num =
    metric === "edits" ? Number(value).toLocaleString("en-US") : String(value);
  const label = metric === "edits" ? "edits" : "day streak";

  const fontSize = 12;
  const numW = Math.ceil(num.length * 7.4); // 12px bold tabular digits
  const labelW = Math.ceil(label.length * 6.2); // 12px medium sans
  const iconBox = 16;
  const padX = 11;
  const gap = 7; // icon → number, number → label
  const h = 28;
  const w = padX + iconBox + gap + numW + gap + labelW + padX;
  const r = radius != null ? radius : 8; // card-like rounding

  const iconY = (h - iconBox) / 2;
  const flame = emoji
    ? `<text x="${padX + iconBox / 2}" y="${h / 2}" font-size="15" text-anchor="middle" dominant-baseline="central">🔥</text>`
    : `<g transform="translate(${padX}, ${iconY}) scale(0.667)" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></g>`;

  const numX = padX + iconBox + gap;
  const labelX = numX + numW + gap;
  const ariaLabel = `${num} ${label}`;
  // Match the dashboard's Urbanist. An <img>-embedded SVG can't reach the page's
  // web fonts, so the font is inlined as an @font-face (a tiny subset pinned to
  // the two weights the badge uses). `sans-serif` closes the stack so renderers
  // without embedded-font support still get sans, never serif. Never lead with
  // an unquoted hyphenated token like `-apple-system` — some renderers drop the
  // whole declaration and fall back to serif.
  const font = "'Urbanist','Segoe UI',system-ui,Helvetica,Arial,sans-serif";
  const fontFaces =
    `@font-face{font-family:'Urbanist';font-style:normal;font-weight:700;src:url(data:font/woff2;base64,${URBANIST_700_WOFF2_B64}) format('woff2');}` +
    `@font-face{font-family:'Urbanist';font-style:normal;font-weight:500;src:url(data:font/woff2;base64,${URBANIST_500_WOFF2_B64}) format('woff2');}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(ariaLabel)}">
  <title>${escapeXml(ariaLabel)}</title>
  <defs><style>${fontFaces}</style></defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="${surface}" stroke="${border}"/>
  ${flame}
  <text x="${numX}" y="${h / 2 + 1}" fill="${ink}" font-family="${font}" font-size="${fontSize}" font-weight="700" text-anchor="start" dominant-baseline="central" style="font-variant-numeric:tabular-nums">${escapeXml(num)}</text>
  <text x="${labelX}" y="${h / 2 + 1}" fill="${muted}" font-family="${font}" font-size="${fontSize}" font-weight="500" text-anchor="start" dominant-baseline="central">${escapeXml(label)}</text>
</svg>`;
}

// Badges get embedded in public READMEs/Notion and hammered by proxies with
// cache-busting params, so memoize the rendered SVG per slug+param set for a
// short TTL to avoid recomputing insights (a real DB aggregation) every hit.
const BADGE_TTL_MS = 60 * 1000;
const badgeCache = new Map(); // key -> { svg, expires }

// GET /api/public/:slug/badge.svg?theme=light|dark&metric=streak|edits&emoji=1
//   Style overrides (bare hex, no `#`): bg, text|ink, muted, accent, border, radius
router.get("/public/:slug/badge.svg", async (req, res) => {
  try {
    const mode = parseMode(req);
    const tz = req.query.tz || DEFAULT_TZ;
    const metric = req.query.metric === "edits" ? "edits" : "streak";
    const theme = req.query.theme === "dark" ? "dark" : "light";
    const emoji = req.query.emoji === "1" || req.query.emoji === "true";

    // Optional style overrides (bare hex, no `#`); invalid values fall back to
    // the theme preset inside buildBadgeSvg.
    const colors = {
      bg: parseHexParam(req.query.bg),
      ink: parseHexParam(req.query.text || req.query.ink),
      muted: parseHexParam(req.query.muted),
      accent: parseHexParam(req.query.accent),
      border: parseHexParam(req.query.border),
    };
    let radius;
    if (req.query.radius != null) {
      const n = parseInt(req.query.radius, 10);
      if (!Number.isNaN(n)) radius = Math.max(0, Math.min(24, n));
    }

    // Every style param must vary the cache key so different looks don't collide.
    const cacheKey = [
      req.params.slug, mode, tz, metric, theme, emoji,
      colors.bg, colors.ink, colors.muted, colors.accent, colors.border, radius,
    ].join("|");

    const sendSvg = (svg) => {
      res.set("Content-Type", "image/svg+xml");
      res.set("Cache-Control", "public, max-age=600");
      res.send(svg);
    };

    const cached = badgeCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return sendSvg(cached.svg);

    const user = await resolvePublicUser(req.params.slug);
    // Don't cache a not-found so a transient miss can't poison later hits.
    if (!user) return res.status(404).json({ error: "Profile not found" });

    const insights = await computeInsights(user, { mode, tz, fileKeys: [] });
    const value = metric === "edits" ? insights.named.total : insights.streak.current;
    const svg = buildBadgeSvg({ metric, value, theme, emoji, colors, radius });

    badgeCache.set(cacheKey, { svg, expires: Date.now() + BADGE_TTL_MS });
    sendSvg(svg);
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
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    // sync_sessions is global (no owner column), so any logged-in user sees
    // every row — keep `error_message` out of it, it can carry internal detail.
    const { data, error } = await supabase
      .from("sync_sessions")
      .select("id, synced_at, files_synced, new_versions_found, status")
      .order("synced_at", { ascending: false })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
