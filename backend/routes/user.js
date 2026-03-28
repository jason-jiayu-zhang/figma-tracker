const express = require("express");
const supabase = require("../supabaseClient");
const router = express.Router();

/**
 * Middleware to mock "current user" since we don't have real sessions yet.
 * In a real app, this would use a session cookie or JWT.
 * For now, we'll just pick the first user in the DB.
 */
async function getActiveUser() {
  const { data: users } = await supabase
    .from("users")
    .select("figma_user_id, access_token, display_name, email, img_url, created_at")
    .limit(1);
  return users ? users[0] : null;
}

// GET /api/user/me -> returns the current connected user
router.get("/me", async (req, res) => {
  try {
    const user = await getActiveUser();
    if (!user) return res.json({ connected: false });
    res.json({ connected: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const figma = require("../figmaService");
const { runSyncAfterDelay } = require("../syncService");

// POST /api/user/files -> adds a new file key to the current user
router.post("/files", async (req, res) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey) return res.status(400).json({ error: "Missing fileKey" });

    const user = await getActiveUser();
    if (!user) return res.status(401).json({ error: "Not connected" });

    // 1. Fetch metadata immediately from Figma
    let meta;
    try {
      meta = await figma.getFileMeta(fileKey, user.access_token);
    } catch (metaErr) {
      console.error(`[/api/user/files] Could not fetch metadata for ${fileKey}:`, metaErr.message);
      return res.status(400).json({ error: `Figma API error: ${metaErr.message}` });
    }

    // 2. Upsert into figma_files (the new source of truth for tracking)
    const { data: fileRow, error: upsertErr } = await supabase
      .from("figma_files")
      .upsert({
        file_key: fileKey,
        name: meta.name,
        thumbnail_url: meta.thumbnailUrl,
        last_modified: meta.lastModified,
        updated_at: new Date().toISOString(),
        sync_completed: false // Ensure it's marked for sync
      }, { onConflict: "file_key" })
      .select("id, file_key")
      .single();

    if (upsertErr) throw upsertErr;

    // 3. Trigger a background sync to backfill version history
    runSyncAfterDelay(100);

    res.json({ success: true, file: fileRow });
  } catch (err) {
    console.error("[/api/user/files] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/files/:fileKey -> removes a file key from the current user
router.delete("/files/:fileKey", async (req, res) => {
  try {
    const { fileKey } = req.params;
    if (!fileKey) return res.status(400).json({ error: "Missing fileKey" });

    // Deleting from figma_files removes it from the global "tracked" list
    const { error: deleteErr } = await supabase
      .from("figma_files")
      .delete()
      .eq("file_key", fileKey);

    if (deleteErr) throw deleteErr;

    res.json({ success: true, message: "File untracked successfully" });
  } catch (err) {
    console.error("[/api/user/files/:fileKey] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
