const express = require("express");
const supabase = require("../supabaseClient");
const { decrypt } = require("../tokenCrypto");
const { getSessionUser, clearSessionCookie } = supabase;
const router = express.Router();

// GET /api/user/me -> current connected user (from session cookie), or 401.
router.get("/me", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const { data: user, error } = await supabase
      .from("users")
      .select("figma_user_id, handle, display_name, img_url, profile_slug, public_enabled")
      .eq("id", session.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    res.json({
      figma_user_id: user.figma_user_id,
      handle: user.handle || user.display_name || null,
      img_url: user.img_url || null,
      profile_slug: user.profile_slug || null,
      public_enabled: !!user.public_enabled,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/logout -> clears ft_session cookie.
router.post("/logout", async (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// POST /api/user/files -> add a tracked file for the session user.
router.post("/files", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const { fileKey } = req.body || {};
    if (!fileKey) return res.status(400).json({ error: "Missing fileKey" });

    // Fetch the session user's access token to fetch file metadata.
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("access_token")
      .eq("id", session.id)
      .maybeSingle();
    if (uErr) throw uErr;
    if (!user?.access_token) return res.status(401).json({ error: "No access token for user" });

    // Optimistic 202 — worker does the slow metadata fetch + insert.
    res.status(202).json({
      success: true,
      message: "File added to sync queue",
      file: { file_key: fileKey },
    });

    const worker = require("../workers/onboardingWorker");
    worker.emit("fetch_file_metadata", {
      fileKey,
      access_token: decrypt(user.access_token),
      userId: session.id,
    });
  } catch (err) {
    console.error("[/api/user/files] Error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/files/:fileKey -> remove one of the session user's files.
router.delete("/files/:fileKey", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const { fileKey } = req.params;
    if (!fileKey) return res.status(400).json({ error: "Missing fileKey" });

    const { error: deleteErr } = await supabase
      .from("figma_files")
      .delete()
      .eq("owner_user_id", session.id)
      .eq("file_key", fileKey);

    if (deleteErr) throw deleteErr;
    res.json({ success: true, message: "File untracked successfully" });
  } catch (err) {
    console.error("[/api/user/files/:fileKey] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/disconnect -> delete ONLY the session user + their files.
router.post("/disconnect", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    // Delete this user's files first (cascades to file_versions + daily_activity).
    const { error: fileError } = await supabase
      .from("figma_files")
      .delete()
      .eq("owner_user_id", session.id);
    if (fileError) throw fileError;

    // Delete the user row.
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .eq("id", session.id);
    if (userError) throw userError;

    clearSessionCookie(res);
    res.json({ success: true, message: "Disconnected and removed your data" });
  } catch (err) {
    console.error("[/api/user/disconnect] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/profile -> update profile_slug / public_enabled.
router.put("/profile", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const { profile_slug, public_enabled } = req.body || {};
    const update = {};

    if (profile_slug !== undefined) {
      if (profile_slug === null || profile_slug === "") {
        update.profile_slug = null;
      } else {
        const slug = String(profile_slug).trim().toLowerCase();
        // URL-safe: lowercase letters, digits and hyphens; 2-50 chars; no leading/trailing hyphen.
        if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug)) {
          return res.status(400).json({
            error:
              "Invalid slug. Use 2-50 chars: lowercase letters, numbers, hyphens (no leading/trailing hyphen).",
          });
        }
        // Uniqueness check (exclude self).
        const { data: existing, error: exErr } = await supabase
          .from("users")
          .select("id")
          .eq("profile_slug", slug)
          .neq("id", session.id)
          .maybeSingle();
        if (exErr) throw exErr;
        if (existing) return res.status(409).json({ error: "Slug already taken" });
        update.profile_slug = slug;
      }
    }

    if (public_enabled !== undefined) {
      update.public_enabled = !!public_enabled;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .update(update)
      .eq("id", session.id)
      .select("figma_user_id, handle, display_name, img_url, profile_slug, public_enabled")
      .single();

    if (error) throw error;

    res.json({
      figma_user_id: user.figma_user_id,
      handle: user.handle || user.display_name || null,
      img_url: user.img_url || null,
      profile_slug: user.profile_slug || null,
      public_enabled: !!user.public_enabled,
    });
  } catch (err) {
    console.error("[/api/user/profile] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
