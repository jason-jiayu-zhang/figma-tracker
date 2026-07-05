const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const supabase = require("../supabaseClient");

// Explicitly load .env from project root
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const router = express.Router();
// In-memory fallback store for oauth states when DB is unavailable
const oauthStateCache = new Map();

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

    console.log(`[/api/oauth/start] Creating state: ${state}`);
    try {
      const { error: stateError } = await supabase.from("oauth_states").insert({ 
        state, 
        expires_at: expiresAt,
        metadata: { fileKeys: fileKeys || "" } 
      });
      if (stateError) throw stateError;
    } catch (err) {
      console.warn("[/api/oauth/start] Supabase insert failed — using in-memory cache for state (dev fallback)", err?.message || err);
      oauthStateCache.set(state, { state, expires_at: expiresAt, metadata: { fileKeys: fileKeys || "" } });
    }

    const scope = "current_user:read file_metadata:read file_versions:read"; // Request minimal scopes (no file_content:read)

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

// GET /api/oauth/callback
router.get("/callback", async (req, res) => {
  console.log("[/api/oauth/callback] Callback received", req.query);
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      console.error("[/api/oauth/callback] Missing code or state");
      return res.status(400).send("Missing code or state");
    }

    // Validate state
    console.log("[/api/oauth/callback] Validating state:", state);
    let states = null;
    try {
      const { data, error: stateError } = await supabase
        .from("oauth_states")
        .select("state, expires_at, metadata")
        .eq("state", state)
        .limit(1)
        .maybeSingle();
      if (stateError) throw stateError;
      states = data;
    } catch (dbErr) {
      console.error("[/api/oauth/callback] Supabase error fetching state:", dbErr.message || dbErr);
      // try in-memory cache fallback
      if (oauthStateCache.has(state)) {
        console.warn("[/api/oauth/callback] Using in-memory oauth state cache");
        states = oauthStateCache.get(state);
      } else {
        return res.status(500).send("Database error validating state");
      }
    }

    if (!states) {
      // final check: maybe in-memory cache
      if (oauthStateCache.has(state)) {
        states = oauthStateCache.get(state);
      }
    }

    if (!states) {
      console.error("[/api/oauth/callback] Invalid or expired state:", state);
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

      console.log("[/api/oauth/callback] Requesting Figma Token with payload:", {
        ...payload,
        client_secret: "[REDACTED]",
      });

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
      
      console.log("[/api/oauth/callback] Response status:", tokenRes.status);

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
      console.log("[/api/oauth/callback] Profile fetched:", profile?.id);

      const { data: userRow, error: upsertError } = await supabase
        .from("users")
        .upsert(
          {
            figma_user_id: profile?.id,
            handle: profile?.handle || profile?.name || null,
            display_name: profile?.handle || profile?.name || null,
            email: profile?.email || null,
            img_url: profile?.img_url || null,
            access_token,
            refresh_token: refresh_token || null,
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
          console.log("[/api/oauth/callback] Seeding files:", fileKeys);
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
      console.error("[/api/oauth/callback] Token exchange error status:", tokenErr.response?.status);
      console.error("[/api/oauth/callback] Token exchange error data:", JSON.stringify(tokenErr.response?.data, null, 2));
      console.error("[/api/oauth/callback] Token exchange error config URL:", tokenErr.config?.url);
      console.error("[/api/oauth/callback] Token exchange full error message:", tokenErr.message);
      return res.status(500).send("Failed to exchange code for token");
    }
  } catch (err) {
    console.error("/api/oauth/callback critical error:", err.message);
    res.status(500).send("OAuth callback failed");
  }
});

module.exports = router;
