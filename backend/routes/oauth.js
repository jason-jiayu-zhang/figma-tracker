const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const supabase = require("../supabaseClient");
const { encrypt } = require("../tokenCrypto");

// Explicitly load .env from project root
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const router = express.Router();
// In-memory fallback store for oauth states when DB is unavailable. Dev only —
// see stateCacheAllowed(); in production a DB failure must fail closed rather
// than move CSRF-state validation into a process-local Map.
const oauthStateCache = new Map();

function stateCacheAllowed() {
  return process.env.NODE_ENV !== "production";
}

// POST /api/oauth/start -> returns an authorization URL to redirect the user to
router.post("/start", async (req, res) => {
  try {
    const { fileKeys } = req.body || {};
    console.log("[/api/oauth/start] Starting OAuth (fileKeys provided:", !!fileKeys, ")");
    
    const clientId = process.env.FIGMA_CLIENT_ID;
    const redirectUri = process.env.FIGMA_OAUTH_REDIRECT_URI;

    if (!clientId || clientId === "undefined" || !redirectUri || redirectUri === "undefined") {
      console.error("[/api/oauth/start] Critical Error: FIGMA_CLIENT_ID or FIGMA_OAUTH_REDIRECT_URI is missing or set to 'undefined'.");
      return res.status(500).json({ 
        error: "Server configuration error: OAuth credentials missing.",
        details: "Please ensure FIGMA_CLIENT_ID and FIGMA_OAUTH_REDIRECT_URI are correctly set in your .env file."
      });
    }

    const state = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // 10 minutes

    try {
      const { error: stateError } = await supabase.from("oauth_states").insert({
        state,
        expires_at: expiresAt,
        metadata: { fileKeys: fileKeys || "" }
      });
      if (stateError) throw stateError;
    } catch (err) {
      if (!stateCacheAllowed()) {
        console.error("[/api/oauth/start] Failed to persist OAuth state:", err?.message || err);
        return res.status(500).json({ error: "Failed to start OAuth" });
      }
      console.warn("[/api/oauth/start] Supabase insert failed — using in-memory cache for state (dev fallback)", err?.message || err);
      oauthStateCache.set(state, { state, expires_at: expiresAt, metadata: { fileKeys: fileKeys || "" } });
    }

    // Minimal read scopes (no file_content:read). file_comments:read and
    // file_dev_resources:read back the Tier-2 comment/dev-resource analytics.
    const scope =
      "current_user:read file_metadata:read file_versions:read file_comments:read file_dev_resources:read";

    const url = `https://www.figma.com/oauth?client_id=${encodeURIComponent(
      clientId,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scope,
    )}&state=${encodeURIComponent(state)}&response_type=code`;

    res.json({ url });
  } catch (err) {
    console.error("/api/oauth/start error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// DEV-ONLY login bypass. Mints an ft_session for an existing user row
// WITHOUT the Figma OAuth round-trip, so the auth-gated dashboard/embed
// pages can be worked on locally. Hard-gated three ways: never in
// production, requires an explicit DEV_LOGIN=1 flag, and only when the
// app is served from localhost. If any gate fails the route 404s so it
// doesn't even advertise its existence.
// Usage: visit http://localhost:5173/api/oauth/dev-login
//        (optionally ?email=… / ?handle=… / ?figma_user_id=… to pick a user)
// ------------------------------------------------------------------
function devLoginAllowed() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.DEV_LOGIN !== "1") return false;
  const appUrl = process.env.APP_URL || process.env.APP_DASHBOARD_URL || "";
  return appUrl.startsWith("http://localhost") || appUrl.startsWith("http://127.0.0.1");
}

router.get("/dev-login", async (req, res) => {
  if (!devLoginAllowed()) return res.status(404).send("Not found");
  try {
    const { figma_user_id, email, handle } = req.query;

    let q = supabase.from("users").select("id, figma_user_id, handle, email");
    if (figma_user_id) q = q.eq("figma_user_id", String(figma_user_id));
    else if (email) q = q.eq("email", String(email));
    else if (handle) q = q.eq("handle", String(handle));
    else q = q.order("created_at", { ascending: false }); // default: newest user

    const { data: user, error } = await q.limit(1).maybeSingle();

    if (error) {
      console.error("[dev-login] DB error:", error.message);
      return res.status(500).send("dev-login: DB error — " + error.message);
    }
    if (!user) {
      return res
        .status(404)
        .send(
          "dev-login: no matching user in the database. Log in once via real OAuth (e.g. on the deployed app) so a user row exists, or pass ?email=…",
        );
    }

    supabase.setSessionCookie(res, { id: user.id, figma_user_id: user.figma_user_id });
    console.warn(
      `[dev-login] ⚠️  Minted a DEV session for ${user.handle || user.email || user.figma_user_id}`,
    );

    const dashboardBase =
      process.env.APP_DASHBOARD_URL || process.env.APP_URL || "http://localhost:5173";
    res.redirect(`${dashboardBase}/dashboard`);
  } catch (err) {
    console.error("[dev-login] error:", err.message);
    res.status(500).send("dev-login failed");
  }
});

// GET /api/oauth/callback
router.get("/callback", async (req, res) => {
  console.log("[/api/oauth/callback] Callback received");
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      console.error("[/api/oauth/callback] Missing code or state");
      return res.status(400).send("Missing code or state");
    }

    // Deleting is the validation: the row comes back only if it still existed,
    // which makes the state single-use and a replayed callback a no-match.
    let states = null;
    try {
      const { data, error: stateError } = await supabase
        .from("oauth_states")
        .delete()
        .eq("state", state)
        .select("state, expires_at, metadata")
        .maybeSingle();
      if (stateError) throw stateError;
      states = data;
    } catch (dbErr) {
      console.error("[/api/oauth/callback] Supabase error consuming state:", dbErr.message || dbErr);
      if (!stateCacheAllowed()) {
        return res.status(500).send("Database error validating state");
      }
    }

    if (!states && stateCacheAllowed() && oauthStateCache.has(state)) {
      console.warn("[/api/oauth/callback] Using in-memory oauth state cache");
      states = oauthStateCache.get(state);
      oauthStateCache.delete(state);
    }

    // Negated comparison so an unparseable expires_at (NaN) also fails closed.
    if (!states || !(new Date(states.expires_at).getTime() > Date.now())) {
      console.error("[/api/oauth/callback] Invalid, expired, or already-used state");
      return res.status(400).send("Invalid or expired state");
    }

    // Exchange code for token
    console.log("[/api/oauth/callback] Exchanging code for token...");
    try {
      const payload = {
        client_id: process.env.FIGMA_CLIENT_ID,
        client_secret: process.env.FIGMA_CLIENT_SECRET,
        redirect_uri: process.env.FIGMA_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
        code: String(code),
      };

      const tokenRes = await axios.post(
        "https://api.figma.com/v1/oauth/token",
        new URLSearchParams(payload),
        {
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
        },
      );

      const { access_token, refresh_token, expires_in, scope } = tokenRes.data;
      console.log("[/api/oauth/callback] Token exchange successful");

      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // AWAIT the profile fetch + user upsert BEFORE redirecting.
      // This kills the login-loop race where the frontend redirects before the
      // user row exists. We need the resulting users.id for the session cookie.
      console.log("[/api/oauth/callback] Fetching Figma profile...");
      const meRes = await axios.get("https://api.figma.com/v1/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const profile = meRes.data;
      console.log("[/api/oauth/callback] Profile fetched");

      const { data: userRow, error: upsertError } = await supabase
        .from("users")
        .upsert(
          {
            figma_user_id: profile?.id,
            handle: profile?.handle || profile?.name || null,
            display_name: profile?.handle || profile?.name || null,
            email: profile?.email || null,
            img_url: profile?.img_url || null,
            access_token: encrypt(access_token),
            refresh_token: encrypt(refresh_token || null),
            scopes: scope || null,
            token_expires_at: expiresAt,
          },
          { onConflict: "figma_user_id" },
        )
        .select("id, figma_user_id")
        .single();

      if (upsertError || !userRow) {
        console.error("[/api/oauth/callback] User upsert failed:", upsertError?.message);
        return res.status(500).send("Failed to persist user profile");
      }
      console.log("[/api/oauth/callback] User upserted:", userRow.id);

      // Set the real session cookie now that the user row exists.
      supabase.setSessionCookie(res, {
        id: userRow.id,
        figma_user_id: userRow.figma_user_id,
      });

      // Seed any files that were requested during OAuth start, scoped to this user.
      if (states.metadata?.fileKeys) {
        const fileKeys = String(states.metadata.fileKeys)
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        if (fileKeys.length > 0) {
          console.log("[/api/oauth/callback] Seeding files:", fileKeys.length);
          const worker = require("../workers/onboardingWorker");
          for (const fileKey of fileKeys) {
            worker.emit("fetch_file_metadata", {
              fileKey,
              access_token,
              userId: userRow.id,
            });
          }
        }
      }

      // Redirect to the dashboard app (fallback to root site).
      const dashboardBase =
        process.env.APP_DASHBOARD_URL || process.env.APP_URL || "http://localhost:5173";
      console.log("[/api/oauth/callback] Session set, redirecting to dashboard...");
      res.redirect(`${dashboardBase}/dashboard`);
    } catch (tokenErr) {
      console.error(
        "[/api/oauth/callback] Token exchange failed:",
        tokenErr.response?.status || "",
        tokenErr.response?.data?.error || tokenErr.message,
      );
      return res.status(500).send("Failed to exchange code for token");
    }
  } catch (err) {
    console.error("/api/oauth/callback critical error:", err.message);
    res.status(500).send("OAuth callback failed");
  }
});

module.exports = router;
