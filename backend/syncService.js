const supabase = require("./supabaseClient");
const figma = require("./figmaService");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Main sync function — pulls Figma data and upserts into Supabase
 * Processes files for each user using their individual OAuth tokens.
 */
async function runSync() {
  console.log(`[sync-v3] Starting full sync at ${new Date().toISOString()}`);
  
  const sessionData = {
    files_synced: 0,
    new_versions_found: 0,
    status: "success",
    error_message: null,
  };

  try {
    // 1. Get the first user for their OAuth token
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("access_token")
      .limit(1);
    
    if (userErr) throw userErr;
    const token = users?.[0]?.access_token;
    if (!token) {
      console.warn("[sync] No user token found. Skipping sync.");
      return sessionData;
    }

    // 2. Get all tracked files from figma_files
    const { data: files, error: fileErr } = await supabase
      .from("figma_files")
      .select("file_key");

    if (fileErr) throw fileErr;

    console.log(`[sync] Processing ${files.length} files from global tracked list`);

    for (const fileRow of files || []) {
      const fileKey = fileRow.file_key;
      try {
          // -- File metadata
          const meta = await figma.getFileMeta(fileKey, token);
          await sleep(300);

          const { data: fileRow, error: fileErr } = await supabase
            .from("figma_files")
            .upsert(
              {
                file_key: fileKey,
                name: meta.name,
                thumbnail_url: meta.thumbnailUrl,
                last_modified: meta.lastModified,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "file_key" },
            )
            .select("id")
            .single();

          if (fileErr) {
            console.error(`[sync] Failed to upsert file record for ${fileKey}:`, fileErr.message);
            continue;
          }

          const fileId = fileRow.id;

          // -- Fetch all versions
          const versions = await figma.getFileVersions(fileKey, token);
          console.log(`[sync] ${fileKey}: Found ${versions.length} total versions`);

          // detect new ones
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

            const { error: vErr } = await supabase
              .from("file_versions")
              .upsert(rows, { onConflict: "file_id,version_id" });

            if (vErr) {
              console.error(`[sync] ${fileKey}: Error inserting versions:`, vErr.message);
            } else {
              sessionData.new_versions_found += newVersions.length;
              
              const byDate = {};
              for (const v of newVersions) {
                const date = v.created_at.slice(0, 10);
                byDate[date] = (byDate[date] || 0) + 1;
              }

              // Recompute absolute counts from file_versions for affected dates
              // This is idempotent — safe to run multiple times without accumulation
              const affectedDates = Object.keys(byDate);
              for (const date of affectedDates) {
                const dateStart = date + "T00:00:00.000Z";
                const dateEnd = date + "T23:59:59.999Z";
                const { count } = await supabase
                  .from("file_versions")
                  .select("id", { count: "exact", head: true })
                  .eq("file_id", fileId)
                  .gte("created_at", dateStart)
                  .lte("created_at", dateEnd);

                const absoluteCount = count || 0;

                const { data: existing } = await supabase
                  .from("daily_activity")
                  .select("id")
                  .eq("file_id", fileId)
                  .eq("activity_date", date)
                  .maybeSingle();

                if (existing) {
                  await supabase
                    .from("daily_activity")
                    .update({ version_count: absoluteCount })
                    .eq("id", existing.id);
                } else {
                  await supabase.from("daily_activity").insert({
                    file_id: fileId,
                    activity_date: date,
                    version_count: absoluteCount,
                  });
                }
              }
            }
          }
          sessionData.files_synced++;
        } catch (fileErr) {
          console.error(`[sync] ${fileKey}: Failed:`, fileErr.message);
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

let nextFileIndex = 0;/**
 * Page sync — called every few seconds (or via cron).
 * Processes ONE file-user task per call (round-robin).
 */
async function runPageSync() {
  // 1. Get the first user for their token
  const { data: users } = await supabase
    .from("users")
    .select("access_token")
    .limit(1);
  const defaultToken = users?.[0]?.access_token;

  // 2. Collect all "tasks" from figma_files table
  const { data: files } = await supabase
    .from("figma_files")
    .select("file_key");
  
  const tasks = (files || []).map(f => ({ fileKey: f.file_key, token: defaultToken }));

  // Fallback to .env keys
  const envKeys = (process.env.FIGMA_FILE_KEYS || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);
  for (const k of envKeys) {
    if (!tasks.find(t => t.fileKey === k)) {
      tasks.push({ fileKey: k, token: null });
    }
  }

  if (tasks.length === 0) return false;

  const task = tasks[nextFileIndex % tasks.length];
  const { fileKey, token } = task;
  nextFileIndex++;

  console.log(`[page-sync-v3] Processing ${fileKey} (using ${token ? "OAuth token" : "PAT/No token"})`);

  try {
    // Fetch current state from DB
    let { data: fileRow, error: fetchErr } = await supabase
      .from("figma_files")
      .select("id, sync_cursor, sync_completed, last_sync_check")
      .eq("file_key", fileKey)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let updateFound = false;
    
    // --- FORWARD SYNC (Fetch newest versions) ---
    // Check for new versions every 5 minutes
    const now = new Date();
    const fiveMins = 5 * 60 * 1000;
    const lastCheck = fileRow?.last_sync_check ? new Date(fileRow.last_sync_check) : new Date(0);

    if ((now - lastCheck) > fiveMins) {
      console.log(`[page-sync-v3] ${fileKey}: Checking for NEW versions...`);
      const { versions } = await figma.getFileVersionsPage(fileKey, null, token); // null = newest page
      
      if (fileRow) {
        const inserted = await processNewVersions(fileRow.id, fileKey, versions);
        if (inserted > 0) updateFound = true;
        
        await supabase.from("figma_files").update({ last_sync_check: now.toISOString() }).eq("id", fileRow.id);
      }
    }

    // --- BACKWARD SYNC (Backfill history) ---
    if (!fileRow) {
      console.log(`[page-sync-v3] ${fileKey}: Initializing...`);
      try {
        const meta = await figma.getFileMeta(fileKey, token);
        const { data: newFile, error: initErr } = await supabase
          .from("figma_files")
          .upsert(
            {
              file_key: fileKey,
              name: meta.name,
              thumbnail_url: meta.thumbnailUrl,
              last_modified: meta.lastModified,
              updated_at: new Date().toISOString(),
              last_sync_check: now.toISOString()
            },
            { onConflict: "file_key" }
          )
          .select("id")
          .single();

        if (initErr) throw initErr;
        fileRow = newFile;
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn(`[page-sync-v3] ${fileKey}: Rate limited (429)`);
        } else if (err.response?.status === 400 && err.response?.data?.err?.includes("File type not supported")) {
          console.error(`[page-sync-v3] ${fileKey}: Unsupported file type. Skipping.`);
          await supabase.from("figma_files").update({ sync_completed: true }).eq("file_key", fileKey);
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
    
    // If it's a JSON string (stored from previous object state), parse it
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

    console.log(`[page-sync-v3] ${fileKey}: Backfilling versions before ${typeof currentCursor === "string" ? currentCursor : "(start)"}`);

    const { versions, nextCursor } = await figma.getFileVersionsPage(fileKey, currentCursor, token);

    if (versions.length === 0) {
      console.log(`[page-sync-v3] ${fileKey}: Reached end of history`);
      await supabase.from("figma_files").update({ sync_completed: true, sync_cursor: null }).eq("id", fileId);
      return updateFound;
    }

    const inserted = await processNewVersions(fileId, fileKey, versions);
    if (inserted > 0 || versions.length > 0) updateFound = true;

    const serializedNextCursor =
      nextCursor && typeof nextCursor === "object"
        ? JSON.stringify(nextCursor)
        : nextCursor;

    await supabase.from("figma_files").update({ 
      sync_cursor: serializedNextCursor, 
      sync_completed: !nextCursor 
    }).eq("id", fileId);
    
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
 * Shared logic to process and aggregate versions
 */
async function processNewVersions(fileId, fileKey, versions) {
  if (versions.length === 0) return 0;

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
        await supabase.from("daily_activity").update({ version_count: absoluteCount || 0 }).eq("id", existing.id);
      } else {
        await supabase.from("daily_activity").insert({ file_id: fileId, activity_date: date, version_count: absoluteCount || 0 });
      }
    }
    console.log(`[page-sync-v3] ${fileKey}: Inserted ${newVersions.length} versions`);
    return newVersions.length;
  }
  return 0;
}

async function runSyncAfterDelay(ms = 30000) {
  setTimeout(() => runSync().catch(e => console.error(e)), ms);
}

module.exports = { runSync, runPageSync, runSyncAfterDelay };
