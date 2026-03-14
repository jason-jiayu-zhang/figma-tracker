const supabase = require("./supabaseClient");
const figma = require("./figmaService");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Main sync function — pulls Figma data and upserts into Supabase
 */
async function runSync() {
  console.log(`[sync] Starting sync at ${new Date().toISOString()}`);
  const sessionData = {
    files_synced: 0,
    new_versions_found: 0,
    status: "success",
    error_message: null,
  };

  try {
    // ── 1. Fetch user profile ───────────────────────────────────────────────
    let me;
    try {
      me = await figma.getMe();
      console.log(`[sync] Authenticated as: ${me.handle} (${me.email})`);
    } catch (err) {
      console.warn(
        `[sync] Could not fetch /me — continuing without user upsert: ${err.message}`,
      );
      me = null;
    }

    if (me) {
      await supabase.from("users").upsert(
        {
          figma_user_id: me.id,
          handle: me.handle,
          email: me.email,
          img_url: me.img_url,
        },
        { onConflict: "figma_user_id" },
      );
    }

    // ── 1b. Discover teams, projects and files for the authenticated user ──
    // If present, automatically expand tracked files to everything in their teams/projects
    const discoveredFileKeys = new Set();
    if (me) {
      try {
        const teams = await figma.getMyTeams();
        console.log(`[sync] Discovered ${teams.length} team(s)`);
        for (const t of teams) {
          // Upsert team into DB
          const { data: teamRow } = await supabase
            .from("teams")
            .upsert(
              { figma_team_id: t.id, name: t.name },
              { onConflict: "figma_team_id" },
            )
            .select("id, figma_team_id")
            .maybeSingle();

          const teamDbId = teamRow ? teamRow.id : null;

          // Get projects for team
          const projects = await figma.getTeamProjects(t.id);
          console.log(`[sync] Team ${t.name} — ${projects.length} project(s)`);
          for (const p of projects) {
            // Get files for project
            const files = await figma.getProjectFiles(p.id);
            console.log(`[sync] Project ${p.name} — ${files.length} file(s)`);
            for (const f of files) {
              // file key may be in `key` or `id` depending on response
              const fileKey = f.key || f.id || f.file_key;
              if (!fileKey) continue;
              discoveredFileKeys.add(fileKey);

              // Upsert minimal file record to link to team/project (metadata will be filled later)
              await supabase.from("figma_files").upsert(
                {
                  file_key: fileKey,
                  name: f.name || null,
                  team_id: teamDbId,
                  project_id: p.id,
                  project_name: p.name || null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "file_key" },
              );
            }
            await sleep(300);
          }
        }
      } catch (err) {
        console.warn(`[sync] Team/project discovery failed: ${err.message}`);
      }
    }

    // ── 1c. Discover files directly owned by the user (best-effort) ──────────
    if (me) {
      try {
        const userFiles = await figma.getUserFiles(me.id);
        console.log(`[sync] Discovered ${userFiles.length} user-owned file(s)`);
        for (const f of userFiles) {
          const fileKey = f.key || f.id || f.file_key;
          if (!fileKey) continue;
          discoveredFileKeys.add(fileKey);

          // Upsert minimal file record
          await supabase.from("figma_files").upsert(
            {
              file_key: fileKey,
              name: f.name || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "file_key" },
          );
        }
      } catch (err) {
        console.warn(`[sync] User-owned file discovery failed: ${err.message}`);
      }
    }

    // ── 2. Process each file ────────────────────────────────────────────────
    const envKeys = (process.env.FIGMA_FILE_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const fileKeys = Array.from(new Set([...(envKeys || []), ...(Array.from(discoveredFileKeys) || [])]));
    console.log(
      `[sync] Tracking ${fileKeys.length} file(s): ${fileKeys.join(", ")}`,
    );

    for (const fileKey of fileKeys) {
      try {
        console.log(`[sync] Processing file: ${fileKey}`);

        // -- File metadata
        const meta = await figma.getFileMeta(fileKey);
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
          console.error(
            `[sync] Failed to upsert file ${fileKey}:`,
            fileErr.message,
          );
          continue;
        }

        const fileId = fileRow.id;

        // -- Fetch all versions
        const versions = await figma.getFileVersions(fileKey);
        console.log(
          `[sync] Found ${versions.length} total versions for ${fileKey}`,
        );

        // -- Get existing version IDs to detect new ones
        const { data: existingRows } = await supabase
          .from("file_versions")
          .select("version_id")
          .eq("file_id", fileId);

        const existingIds = new Set(
          (existingRows || []).map((r) => r.version_id),
        );

        const newVersions = versions.filter((v) => !existingIds.has(v.id));
        console.log(
          `[sync] ${newVersions.length} new version(s) to insert for ${fileKey}`,
        );

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
            console.error(`[sync] Error inserting versions:`, vErr.message);
          } else {
            sessionData.new_versions_found += newVersions.length;
          }

          // -- Update daily_activity aggregates
          const byDate = {};
          for (const v of newVersions) {
            const date = v.created_at.slice(0, 10); // YYYY-MM-DD
            byDate[date] = (byDate[date] || 0) + 1;
          }

          for (const [date, count] of Object.entries(byDate)) {
            // Upsert with increment
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

        sessionData.files_synced++;
      } catch (fileErr) {
        console.error(
          `[sync] Error processing file ${fileKey}:`,
          fileErr.message,
        );
      }
    }
  } catch (err) {
    console.error(`[sync] Fatal sync error:`, err.message);
    sessionData.status = "error";
    sessionData.error_message = err.message;
  }

  // ── 3. Log sync session ──────────────────────────────────────────────────
  const { error: sessionErr } = await supabase
    .from("sync_sessions")
    .insert(sessionData);
  if (sessionErr) {
    console.error(`[sync] Failed to log sync session:`, sessionErr.message);
  }

  console.log(
    `[sync] Done. Files: ${sessionData.files_synced}, New versions: ${sessionData.new_versions_found}`,
  );
  return sessionData;
}

/**
 * Page sync — called every minute.
 * For each tracked file, finds the oldest version already stored and asks Figma
 * for the 30 versions that came before it (backward pagination).
 * Persistent state is kept in pagination_state.json to ensure we don't stall.
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

  const fileKeys = (process.env.FIGMA_FILE_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  for (const fileKey of fileKeys) {
    try {
      const fileState = state[fileKey] || {};
      if (fileState.completed) {
        console.log(`[page-sync] ${fileKey} — history fully synced (idle)`);
        continue;
      }

      // Look up our internal file ID
      const { data: fileRow } = await supabase
        .from("figma_files")
        .select("id")
        .eq("file_key", fileKey)
        .maybeSingle();
      if (!fileRow) {
        console.log(`[page-sync] File ${fileKey} not yet in DB — skipping`);
        continue;
      }
      const fileId = fileRow.id;

      // Determine cursor:
      // 1. Manually stored cursor from last run
      // 2. Oldest version in DB (fallback for first run)
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

      console.log(
        `[page-sync] ${fileKey} — fetching 30 versions before: ${typeof currentCursor === "string" ? currentCursor : JSON.stringify(currentCursor) || "(start)"}`,
      );

      const { versions, nextCursor } = await figma.getFileVersionsPage(
        fileKey,
        currentCursor,
      );

      if (versions.length === 0) {
        console.log(`[page-sync] ${fileKey} — REACHED BEGINNING OF HISTORY`);
        state[fileKey] = { ...fileState, completed: true, lastCursor: null };
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        continue;
      }

      // Only insert versions we don't already have
      const { data: existingRows } = await supabase
        .from("file_versions")
        .select("version_id")
        .eq("file_id", fileId);
      const existingIds = new Set(
        (existingRows || []).map((r) => r.version_id),
      );
      const newVersions = versions.filter((v) => !existingIds.has(v.id));

      console.log(
        `[page-sync] ${fileKey} — ${newVersions.length} new of ${versions.length} fetched`,
      );

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
          console.error(`[page-sync] ${fileKey} — insert error:`, vErr.message);
        } else {
          // Update daily_activity
          const byDate = {};
          for (const v of newVersions)
            byDate[v.created_at.slice(0, 10)] =
              (byDate[v.created_at.slice(0, 10)] || 0) + 1;
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
          console.log(
            `[page-sync] ${fileKey} — inserted ${newVersions.length} versions`,
          );
        }
      }

      // Store the next cursor even if 0 new versions found, to move forward
      state[fileKey] = {
        ...fileState,
        lastCursor: nextCursor,
        completed: !nextCursor,
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error(`[page-sync] Error processing ${fileKey}:`, err.message);
    }
  }
}

/**
 * Triggered sync with a delay (e.g. for webhooks)
 */
async function runSyncAfterDelay(ms = 30000) {
  console.log(`[sync] Scheduled sync in ${ms / 1000}s...`);
  setTimeout(async () => {
    try {
      await runSync();
    } catch (err) {
      console.error(`[sync] Delayed sync failed:`, err.message);
    }
  }, ms);
}

module.exports = { runSync, runPageSync, runSyncAfterDelay };
