const express = require("express");
const supabase = require("../supabaseClient");
const { decrypt } = require("../tokenCrypto");
const figma = require("../figmaService");
const { ensureFreshToken, runSyncAfterDelay } = require("../syncService");
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

    // Fetch the session user's token (refreshing if expired, like the sync path).
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("id, access_token, refresh_token, token_expires_at")
      .eq("id", session.id)
      .maybeSingle();
    if (uErr) throw uErr;
    if (!user?.access_token) return res.status(401).json({ error: "No access token for user" });

    user.access_token = decrypt(user.access_token);
    user.refresh_token = decrypt(user.refresh_token);
    const token = await ensureFreshToken(user);

    // Fetch metadata synchronously so we can report real success/failure instead
    // of an optimistic 202 that silently swallows Figma errors.
    let meta;
    try {
      meta = await figma.getFileMeta(fileKey, token);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        return res.status(404).json({ error: "File not found. Check that the file key or link is correct." });
      }
      if (status === 403) {
        return res.status(403).json({ error: "Your Figma account doesn't have access to this file." });
      }
      const detail = err.response?.data?.err || err.response?.data?.message || err.message;
      return res.status(502).json({ error: `Couldn't look up that file on Figma: ${detail}` });
    }

    const { error: upsertErr } = await supabase
      .from("figma_files")
      .upsert(
        {
          owner_user_id: user.id,
          file_key: fileKey,
          name: meta.name,
          thumbnail_url: meta.thumbnailUrl,
          last_modified: meta.lastModified,
          updated_at: new Date().toISOString(),
          sync_completed: false,
        },
        { onConflict: "owner_user_id,file_key" },
      );
    if (upsertErr) throw upsertErr;

    res.status(201).json({
      success: true,
      file: {
        file_key: fileKey,
        name: meta.name,
        thumbnail_url: meta.thumbnailUrl,
        last_modified: meta.lastModified,
      },
    });

    // Pull version history in the background (best-effort).
    runSyncAfterDelay(100);
  } catch (err) {
    console.error("[/api/user/files] Error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// PATCH /api/user/files/:fileKey -> archive/unarchive one of the session user's files.
router.patch("/files/:fileKey", async (req, res) => {
  try {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const { fileKey } = req.params;
    if (!fileKey) return res.status(400).json({ error: "Missing fileKey" });

    const { archived } = req.body || {};
    if (typeof archived !== "boolean") {
      return res.status(400).json({ error: "Missing or invalid 'archived' boolean" });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("figma_files")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("owner_user_id", session.id)
      .eq("file_key", fileKey)
      .select("id");

    if (updateErr) throw updateErr;
    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    res.json({ success: true, archived });
  } catch (err) {
    console.error("[/api/user/files/:fileKey PATCH] Error:", err.message);
    res.status(500).json({ error: err.message });
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
