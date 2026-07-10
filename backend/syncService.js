const supabase = require("./supabaseClient");
const figma = require("./figmaService");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// Per-file token resolution (multi-account)
// ============================================================

/**
 * Return a valid access token for a user row, refreshing + persisting if the
 * stored token is near or past expiry. Falls back to the existing token on
 * refresh failure.
 * @param {{ id, access_token, refresh_token, token_expires_at }|null} user
 */
async function ensureFreshToken(user) {
  if (!user) return null;
  let token = user.access_token || null;

  const exp = user.token_expires_at
    ? new Date(user.token_expires_at).getTime()
    : null;
  const bufferMs = 5 * 60 * 1000; // refresh if within 5 minutes of expiry
  const needsRefresh = exp !== null && exp - Date.now() < bufferMs;

  if (needsRefresh && user.refresh_token) {
    try {
      const refreshed = await figma.refreshAccessToken(user.refresh_token);
      token = refreshed.access_token;
      const newExpiry = new Date(
        Date.now() + (refreshed.expires_in || 0) * 1000,
      ).toISOString();
      const update = { access_token: token, token_expires_at: newExpiry };
      if (refreshed.refresh_token) update.refresh_token = refreshed.refresh_token;
      await supabase.from("users").update(update).eq("id", user.id);
      console.log(`[sync] Refreshed access token for user ${user.id}`);
    } catch (e) {
      console.error(
        `[sync] Token refresh failed for user ${user.id}:`,
        e.response?.data || e.message,
      );
      // keep the (possibly stale) existing token as a last resort
    }
  }

  return token;
}

/**
 * Resolve a (fresh) token for a given owner_user_id, using an in-run cache.
 */
async function getOwnerToken(ownerId, cache) {
  if (!ownerId) return null;
  if (cache.has(ownerId)) return cache.get(ownerId);
  const { data: user } = await supabase
    .from("users")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("id", ownerId)
    .maybeSingle();
  const token = (await ensureFreshToken(user)) || null;
  cache.set(ownerId, token);
  return token;
}

/**
 * Main sync function — pulls Figma data and upserts into Supabase.
 * Resolves EACH file's owner token (refreshing if expired) instead of a single
 * global user.
 */
async function runSync() {
  console.log(`[sync-v3] Starting full sync at ${new Date().toISOString()}`);

  const sessionData = {
    files_synced: 0,
    new_versions_found: 0,
    status: "success",
    error_message: null,
  };

  const tokenCache = new Map();

  try {
    // Get all tracked files WITH their owner.
    const { data: files, error: fileErr } = await supabase
      .from("figma_files")
      .select("id, file_key, owner_user_id");

    if (fileErr) throw fileErr;

    console.log(`[sync] Processing ${files?.length || 0} files`);

    for (const fileRow of files || []) {
      const fileKey = fileRow.file_key;
      const ownerId = fileRow.owner_user_id;
      try {
        const token = await getOwnerToken(ownerId, tokenCache);
        if (!token) {
          console.warn(`[sync] ${fileKey}: no owner token available, skipping`);
          continue;
        }

        // -- File metadata
        const meta = await figma.getFileMeta(fileKey, token);
        await sleep(300);

        const { data: upserted, error: upErr } = await supabase
          .from("figma_files")
          .upsert(
            {
              owner_user_id: ownerId,
              file_key: fileKey,
              name: meta.name,
              thumbnail_url: meta.thumbnailUrl,
              last_modified: meta.lastModified,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "owner_user_id,file_key" },
          )
          .select("id")
          .single();

        if (upErr) {
          console.error(`[sync] Failed to upsert file record for ${fileKey}:`, upErr.message);
          continue;
        }

        const fileId = upserted.id;

        // -- Fetch all versions
        const versions = await figma.getFileVersions(fileKey, token);
        console.log(`[sync] ${fileKey}: Found ${versions.length} total versions`);

        const inserted = await processNewVersions(fileId, fileKey, versions);
        sessionData.new_versions_found += inserted;
        sessionData.files_synced++;

        await sleep(300);
        await syncCommentsAndResources(fileId, fileKey, token);
      } catch (fileErr2) {
        console.error(`[sync] ${fileKey}: Failed:`, fileErr2.message);
      }
    }
  } catch (err) {
    console.error(`[sync] Fatal:`, err.message);
    sessionData.status = "error";
    sessionData.error_message = err.message;
  }

  await supabase.from("sync_sessions").insert(sessionData);
  console.log(`[sync] Done. Files: ${sessionData.files_synced}, New versions: ${sessionData.new_versions_found}`);
  return sessionData;
}

/**
 * Page sync — called every few seconds (or via cron).
 * Processes ONE file task per call (round-robin, stateless/serverless friendly).
 * Resolves the file's owner token.
 */
async function runPageSync() {
  const tokenCache = new Map();

  // Collect all files WITH owner, ordered by updated_at ascending (oldest first).
  const { data: files } = await supabase
    .from("figma_files")
    .select("file_key, updated_at, owner_user_id")
    .order("updated_at", { ascending: true, nullsFirst: true });

  const tasks = (files || []).map((f) => ({
    fileKey: f.file_key,
    ownerId: f.owner_user_id,
    updatedAt: f.updated_at,
  }));

  if (tasks.length === 0) return false;

  // Oldest updatedAt (nulls first) at the front.
  tasks.sort((a, b) => {
    if (a.updatedAt === null && b.updatedAt === null) return 0;
    if (a.updatedAt === null) return -1;
    if (b.updatedAt === null) return 1;
    return new Date(a.updatedAt) - new Date(b.updatedAt);
  });

  const task = tasks[0];
  const { fileKey, ownerId } = task;

  // Resolve this file's owner token (refresh if needed). Every tracked file must
  // have an owner with a valid OAuth token — there is no PAT fallback anymore.
  const token = ownerId ? await getOwnerToken(ownerId, tokenCache) : null;
  if (!token) {
    console.warn(
      `[page-sync-v3] ${fileKey}: no owner OAuth token available (owner ${ownerId || "none"}), skipping`,
    );
    // Rotate this file to the back of the queue so a tokenless file doesn't block others.
    await supabase
      .from("figma_files")
      .update({ updated_at: new Date().toISOString() })
      .eq("file_key", fileKey);
    return false;
  }

  console.log(
    `[page-sync-v3] Processing ${fileKey} (owner ${ownerId}, using OAuth token)`,
  );

  try {
    // Fetch current state from DB (scoped to owner when known).
    let fileQuery = supabase
      .from("figma_files")
      .select("id, sync_cursor, sync_completed, last_sync_check, owner_user_id")
      .eq("file_key", fileKey);
    if (ownerId) fileQuery = fileQuery.eq("owner_user_id", ownerId);

    let { data: fileRow, error: fetchErr } = await fileQuery.maybeSingle();
    if (fetchErr) throw fetchErr;

    const now = new Date();

    // Move this file to the back of the queue immediately.
    if (fileRow) {
      await supabase
        .from("figma_files")
        .update({ updated_at: now.toISOString() })
        .eq("id", fileRow.id);
    }

    let updateFound = false;

    // --- FORWARD SYNC (fetch newest versions) ---
    const fiveMins = 5 * 60 * 1000;
    const lastCheck = fileRow?.last_sync_check
      ? new Date(fileRow.last_sync_check)
      : new Date(0);

    if (fileRow && now - lastCheck > fiveMins) {
      console.log(`[page-sync-v3] ${fileKey}: Checking for NEW versions...`);

      // Page BACKWARD from the newest until we hit an already-known version_id
      // (or a safety cap) so bursts of >30 versions between checks aren't lost.
      const { data: knownRows } = await supabase
        .from("file_versions")
        .select("version_id")
        .eq("file_id", fileRow.id);
      const knownIds = new Set((knownRows || []).map((r) => r.version_id));

      const collected = [];
      let cursor = null;
      let pages = 0;
      const SAFETY_CAP = 10; // up to ~300 recent versions per check
      while (pages < SAFETY_CAP) {
        const { versions, nextCursor } = await figma.getFileVersionsPage(
          fileKey,
          cursor,
          token,
        );
        if (!versions.length) break;
        collected.push(...versions);
        const hitKnown = versions.some((v) => knownIds.has(v.id));
        if (hitKnown || !nextCursor) break;
        cursor = nextCursor;
        pages++;
        await sleep(300);
      }

      const inserted = await processNewVersions(fileRow.id, fileKey, collected);
      if (inserted > 0) updateFound = true;

      await sleep(300);
      await syncCommentsAndResources(fileRow.id, fileKey, token);

      await supabase
        .from("figma_files")
        .update({ last_sync_check: now.toISOString() })
        .eq("id", fileRow.id);
    }

    // --- INIT (new file) ---
    if (!fileRow) {
      console.log(`[page-sync-v3] ${fileKey}: Initializing...`);
      try {
        const meta = await figma.getFileMeta(fileKey, token);
        const { data: newFile, error: initErr } = await supabase
          .from("figma_files")
          .upsert(
            {
              owner_user_id: ownerId,
              file_key: fileKey,
              name: meta.name,
              thumbnail_url: meta.thumbnailUrl,
              last_modified: meta.lastModified,
              updated_at: new Date().toISOString(),
              last_sync_check: now.toISOString(),
            },
            { onConflict: "owner_user_id,file_key" },
          )
          .select("id, sync_cursor, sync_completed, owner_user_id")
          .single();

        if (initErr) throw initErr;
        fileRow = newFile;
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn(`[page-sync-v3] ${fileKey}: Rate limited (429)`);
        } else if (
          err.response?.status === 400 &&
          err.response?.data?.err?.includes("File type not supported")
        ) {
          console.error(`[page-sync-v3] ${fileKey}: Unsupported file type. Skipping.`);
          let skipQuery = supabase
            .from("figma_files")
            .update({ sync_completed: true })
            .eq("file_key", fileKey);
          if (ownerId) skipQuery = skipQuery.eq("owner_user_id", ownerId);
          await skipQuery;
        } else {
          console.error(`[page-sync-v3] ${fileKey}: Init failed:`, err.response?.data || err.message);
        }
        return updateFound;
      }
    }

    if (fileRow.sync_completed) {
      return updateFound;
    }

    const fileId = fileRow.id;
    let currentCursor = fileRow.sync_cursor;

    if (typeof currentCursor === "string" && currentCursor.startsWith("{")) {
      try {
        currentCursor = JSON.parse(currentCursor);
      } catch (e) {
        console.warn(`[page-sync-v3] Failed to parse cursor for ${fileKey}:`, currentCursor);
      }
    }

    if (!currentCursor) {
      const { data: oldest } = await supabase
        .from("file_versions")
        .select("version_id")
        .eq("file_id", fileId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      currentCursor = oldest ? oldest.version_id : null;
    }

    console.log(
      `[page-sync-v3] ${fileKey}: Backfilling versions before ${typeof currentCursor === "string" ? currentCursor : "(start)"}`,
    );

    const { versions, nextCursor } = await figma.getFileVersionsPage(
      fileKey,
      currentCursor,
      token,
    );

    if (versions.length === 0) {
      console.log(`[page-sync-v3] ${fileKey}: Reached end of history`);
      await supabase
        .from("figma_files")
        .update({ sync_completed: true, sync_cursor: null })
        .eq("id", fileId);
      return updateFound;
    }

    const inserted = await processNewVersions(fileId, fileKey, versions);
    if (inserted > 0 || versions.length > 0) updateFound = true;

    const serializedNextCursor =
      nextCursor && typeof nextCursor === "object"
        ? JSON.stringify(nextCursor)
        : nextCursor;

    await supabase
      .from("figma_files")
      .update({
        sync_cursor: serializedNextCursor,
        sync_completed: !nextCursor,
      })
      .eq("id", fileId);

    return updateFound;
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn(`[page-sync-v3] ${fileKey}: Rate limited (429)`);
    } else {
      console.error(`[page-sync-v3] ${fileKey}: Error:`, err.message);
    }
    return false;
  }
}

/**
 * Shared logic to process and aggregate versions.
 */
async function processNewVersions(fileId, fileKey, versions) {
  if (!versions || versions.length === 0) return 0;

  const { data: existingRows } = await supabase
    .from("file_versions")
    .select("version_id")
    .eq("file_id", fileId);
  const existingIds = new Set((existingRows || []).map((r) => r.version_id));
  const newVersions = versions.filter((v) => !existingIds.has(v.id));

  if (newVersions.length > 0) {
    const rows = newVersions.map((v) => ({
      file_id: fileId,
      version_id: v.id,
      label: v.label || null,
      description: v.description || null,
      created_at: v.created_at,
      created_by_figma_user_id: v.user ? v.user.id : null,
      created_by_handle: v.user ? v.user.handle : null,
    }));

    await supabase.from("file_versions").upsert(rows, { onConflict: "file_id,version_id" });

    const byDate = {};
    for (const v of newVersions) {
      const date = v.created_at.slice(0, 10);
      byDate[date] = (byDate[date] || 0) + 1;
    }
    for (const date of Object.keys(byDate)) {
      const dateStart = date + "T00:00:00.000Z";
      const dateEnd = date + "T23:59:59.999Z";
      const { count: absoluteCount } = await supabase
        .from("file_versions")
        .select("id", { count: "exact", head: true })
        .eq("file_id", fileId)
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);

      const { data: existing } = await supabase
        .from("daily_activity")
        .select("id")
        .eq("file_id", fileId)
        .eq("activity_date", date)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("daily_activity")
          .update({ version_count: absoluteCount || 0 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("daily_activity")
          .insert({ file_id: fileId, activity_date: date, version_count: absoluteCount || 0 });
      }
    }
    console.log(`[page-sync-v3] ${fileKey}: Inserted ${newVersions.length} versions`);
    return newVersions.length;
  }
  return 0;
}

/**
 * Fetch and persist comments + dev resources for one file.
 * Tier-2 data depends on the file_comments:read / file_dev_resources:read scopes.
 * Owners authorized before those scopes existed get a 403 — we swallow it so the
 * core version sync is never blocked by a missing scope.
 */
async function syncCommentsAndResources(fileId, fileKey, token) {
  // --- Comments (upsert-only: keep history even if a thread is later deleted) ---
  try {
    const comments = await figma.getFileComments(fileKey, token);
    if (comments.length > 0) {
      const rows = comments.map((c) => ({
        file_id: fileId,
        comment_id: c.id,
        parent_comment_id: c.parent_id || null,
        message: c.message || null,
        created_at: c.created_at,
        resolved_at: c.resolved_at || null,
        author_figma_user_id: c.user ? c.user.id : null,
        author_handle: c.user ? c.user.handle : null,
      }));
      await supabase
        .from("file_comments")
        .upsert(rows, { onConflict: "file_id,comment_id" });
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[sync] ${fileKey}: comments scope missing (403), skipping comments`);
    } else {
      console.error(`[sync] ${fileKey}: comment sync failed:`, err.response?.data || err.message);
    }
  }
  await sleep(300);

  // --- Dev resources (full refresh: it's a current-state count, deletions matter) ---
  try {
    const resources = await figma.getDevResources(fileKey, token);
    await supabase.from("dev_resources").delete().eq("file_id", fileId);
    if (resources.length > 0) {
      const rows = resources.map((r) => ({
        file_id: fileId,
        dev_resource_id: r.id,
        name: r.name || null,
        url: r.url || null,
        node_id: r.node_id || null,
      }));
      await supabase.from("dev_resources").insert(rows);
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[sync] ${fileKey}: dev_resources scope missing (403), skipping`);
    } else {
      console.error(`[sync] ${fileKey}: dev resource sync failed:`, err.response?.data || err.message);
    }
  }
}

async function runSyncAfterDelay(ms = 30000) {
  setTimeout(() => runSync().catch((e) => console.error(e)), ms);
}

module.exports = {
  runSync,
  runPageSync,
  runSyncAfterDelay,
  ensureFreshToken,
  getOwnerToken,
};
