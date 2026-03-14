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
    // 1. Get all users with file keys
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("figma_user_id, access_token, settings_data");
    
    if (userErr) throw userErr;

    for (const user of users || []) {
      const token = user.access_token;
      const fileKeys = (user.settings_data?.fileKeys || "")
        .split(",")
        .map(k => k.trim())
        .filter(Boolean);

      if (fileKeys.length === 0) continue;

      console.log(`[sync] User ${user.figma_user_id}: Processing ${fileKeys.length} files`);

      for (const fileKey of fileKeys) {
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

              for (const [date, count] of Object.entries(byDate)) {
                const { data: existing } = await supabase
                  .from("daily_activity")
                  .select("id, version_count")
                  .eq("file_id", fileId)
                  .eq("activity_date", date)
                  .maybeSingle();

                if (existing) {
                  await supabase
                    .from("daily_activity")
                    .update({ version_count: existing.version_count + count })
                    .eq("id", existing.id);
                } else {
                  await supabase.from("daily_activity").insert({
                    file_id: fileId,
                    activity_date: date,
                    version_count: count,
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

let nextFileIndex = 0;

/**
 * Page sync — called every few seconds.
 * Processes ONE file-user task per call (round-robin).
 */
async function runPageSync() {
  const fs = require("fs");
  const path = require("path");
  const statePath = path.join(__dirname, "..", "pagination_state.json");

  let state = {};
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    } catch (_) {
      state = {};
    }
  }

  // 1. Collect all "tasks" (user + fileKey)
  const { data: users } = await supabase
    .from("users")
    .select("figma_user_id, access_token, settings_data");
  
  const tasks = [];
  for (const user of users || []) {
    const keys = (user.settings_data?.fileKeys || "")
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);
    for (const k of keys) {
      tasks.push({ fileKey: k, token: user.access_token });
    }
  }

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

  if (tasks.length === 0) return;

  const task = tasks[nextFileIndex % tasks.length];
  const { fileKey, token } = task;
  nextFileIndex++;

  console.log(`[page-sync-v3] Processing ${fileKey} (using ${token ? "OAuth token" : "PAT/No token"})`);

  try {
    const fileState = state[fileKey] || {};
    
    // --- FORWARD SYNC (Fetch newest versions) ---
    // Check for new versions every 5 minutes
    const now = Date.now();
    const fiveMins = 5 * 60 * 1000;
    if (!fileState.lastNewCheck || (now - fileState.lastNewCheck) > fiveMins) {
      console.log(`[page-sync-v3] ${fileKey}: Checking for NEW versions...`);
      const { versions } = await figma.getFileVersionsPage(fileKey, null, token); // null = newest page
      
      const { data: fileRow } = await supabase.from("figma_files").select("id").eq("file_key", fileKey).maybeSingle();
      if (fileRow) {
        await processNewVersions(fileRow.id, fileKey, versions);
      }
      
      state[fileKey] = { ...fileState, lastNewCheck: now, idle_logged: false };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      // Don't return, we can still do a backfill step in the same task
    }

    // --- BACKWARD SYNC (Backfill history) ---
    if (fileState.completed || fileState.unsupported) {
      if (!fileState.idle_logged) {
        console.log(`[page-sync-v3] ${fileKey} — ${fileState.unsupported ? "unsupported file type" : "fully synced"} (idle)`);
        state[fileKey] = { ...state[fileKey], idle_logged: true };
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      }
      return;
    }

    let { data: fileRow } = await supabase
      .from("figma_files")
      .select("id")
      .eq("file_key", fileKey)
      .maybeSingle();

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
          console.error(`[page-sync-v3] ${fileKey}: Unsupported file type (Figma Make). Skipping.`);
          state[fileKey] = { ...state[fileKey], unsupported: true, completed: true };
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        } else {
          console.error(`[page-sync-v3] ${fileKey}: Init failed:`, err.response?.data || err.message);
        }
        return;
      }
    }
    
    const fileId = fileRow.id;
    let currentCursor = fileState.lastCursor;
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
      state[fileKey] = { ...state[fileKey], completed: true, lastCursor: null };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      return;
    }

    await processNewVersions(fileId, fileKey, versions);

    state[fileKey] = { ...state[fileKey], lastCursor: nextCursor, completed: !nextCursor };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  } catch (err) {
    if (err.response?.status === 429) {
      console.warn(`[page-sync-v3] ${fileKey}: Rate limited (429)`);
    } else {
      console.error(`[page-sync-v3] ${fileKey}: Error:`, err.message);
    }
  }
}

/**
 * Shared logic to process and aggregate versions
 */
async function processNewVersions(fileId, fileKey, versions) {
  if (versions.length === 0) return;

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
    for (const [date, count] of Object.entries(byDate)) {
      const { data: existing } = await supabase
        .from("daily_activity")
        .select("id, version_count")
        .eq("file_id", fileId)
        .eq("activity_date", date)
        .maybeSingle();
      if (existing) {
        await supabase.from("daily_activity").update({ version_count: existing.version_count + count }).eq("id", existing.id);
      } else {
        await supabase.from("daily_activity").insert({ file_id: fileId, activity_date: date, version_count: count });
      }
    }
    console.log(`[page-sync-v3] ${fileKey}: Inserted ${newVersions.length} versions`);
  }
}

async function runSyncAfterDelay(ms = 30000) {
  setTimeout(() => runSync().catch(e => console.error(e)), ms);
}

module.exports = { runSync, runPageSync, runSyncAfterDelay };
