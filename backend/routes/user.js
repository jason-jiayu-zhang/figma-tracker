const express = require("express");
const supabase = require("../supabaseClient");
const router = express.Router();

/**
 * Middleware to mock "current user" since we don't have real sessions yet.
 * In a real app, this would use a session cookie or JWT.
 * For now, we'll just pick the first user in the DB.
 */
async function getActiveUser() {
  const { data: users } = await supabase.from("users").select("*").limit(1);
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

// POST /api/user/files -> adds a new file key to the current user
router.post("/files", async (req, res) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey) return res.status(400).json({ error: "Missing fileKey" });

    const user = await getActiveUser();
    if (!user) return res.status(401).json({ error: "Not connected" });

    const currentKeys = (user.settings_data?.fileKeys || "")
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    if (currentKeys.includes(fileKey)) {
      return res.json({ success: true, message: "Already tracking" });
    }

    const newKeys = [...currentKeys, fileKey].join(",");
    const { error: updateErr } = await supabase
      .from("users")
      .update({ settings_data: { ...user.settings_data, fileKeys: newKeys } })
      .eq("figma_user_id", user.figma_user_id);

    if (updateErr) throw updateErr;

    res.json({ success: true, keys: newKeys });
  } catch (err) {
    console.error("[/api/user/files] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
