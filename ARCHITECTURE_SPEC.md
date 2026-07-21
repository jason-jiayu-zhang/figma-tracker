# Figma Tracker — Multi-Account Architecture

This document describes the multi-account architecture: the session primitive, the database
shape, the API surface, and the routing model. The names and shapes below are the contract
between the backend, the frontend, and the deployment configuration.

## Product model
- Primary login is **Figma OAuth**. After login the user lands on their **own** dashboard.
- Every user sees **only their own tracked files**.
- A user can publish a **public profile** (read-only heatmap + files) and **embed links**,
  addressed by a URL-safe `profile_slug`.
- If two accounts track the **same** Figma file, each has their own `figma_files` row.
  Both rows accumulate the file's full version history (Figma returns all authors'
  versions). The UI exposes a toggle: **All changes** vs **My changes**, where "My changes"
  filters versions to `created_by_figma_user_id == session user's figma_user_id`.

## Sessions (the core new primitive)
- Cookie-based. On OAuth callback, after the user row is upserted, set an **httpOnly,
  Secure, SameSite=Lax** cookie named `ft_session`.
- Value = JWT signed with `process.env.SESSION_SECRET` (set in the host env — Render),
  payload `{ uid: <users.id UUID>, fu: <figma_user_id> }`, 30-day expiry.
- Backend helper `getSessionUser(req)` reads/verifies the cookie and returns
  `{ id, figma_user_id }` or `null`. Every route that needs the current user resolves it
  this way — never by reading the first row of `users`.
- Deps: `jsonwebtoken` and `cookie-parser`; `cookie-parser` is wired in `server.js`.
- CORS: `cors({ origin: <APP_URL(s)>, credentials: true })` — a wildcard
  origin cannot be used with credentialed cookies. Frontend sends `credentials: 'include'`.

## Schema
`schema.sql` is the single source of truth and is idempotent, so re-running it on a live
database only adds what is missing — it never drops columns or data.
- `users`: `profile_slug TEXT UNIQUE`, `public_enabled BOOLEAN NOT NULL DEFAULT false`.
- `figma_files`: `owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE`. Uniqueness is
  per owner — `UNIQUE(owner_user_id, file_key)`, not a global `file_key UNIQUE`.
- `file_versions` / `daily_activity` are keyed by `file_id`. Attribution is carried by
  `created_by_figma_user_id`.

## API contract (all under `/api`; cookie-authed unless marked PUBLIC)
- `GET  /api/oauth/start` → `{ url }` (Figma authorize URL; CSRF state stored).
- `GET  /api/oauth/callback` → exchange code, `await` user upsert (fixes the login-loop
  race — do the profile fetch + upsert BEFORE redirecting), set `ft_session`, redirect to
  `${APP_URL}/dashboard`.
- `GET  /api/user/me` → `{ figma_user_id, handle, img_url, profile_slug, public_enabled }`
  or `401` if no valid session.
- `POST /api/user/logout` → clears `ft_session`.
- `POST /api/user/files` → add tracked file for the session user (`owner_user_id = uid`).
- `DELETE /api/user/files/:fileKey` → remove one of the session user's files.
- `POST /api/user/disconnect` → delete ONLY the session user + their files (never global).
- `PUT  /api/user/profile` → body `{ profile_slug?, public_enabled? }`; validates slug is
  unique + URL-safe.
- `GET  /api/stats?scope=mine&mode=all|individual`
- `GET  /api/activity?days=&mode=all|individual&tz=<IANA>&fileKeys=`
- `GET  /api/files?mode=all|individual`
  - All three are scoped to the session user's owned files. `mode=individual` filters
    versions to the session user's `figma_user_id`.
- PUBLIC (no cookie): `GET /api/public/:slug/stats|activity|files` — only if that user's
  `public_enabled` is true. Powers the public profile + embed.

## Timezone (fix the off-by-one)
- `/api/activity` accepts `tz` (IANA string sent by the client, e.g. `America/Los_Angeles`).
- Backend buckets each version's `created_at` into that tz's calendar date using
  `Intl.DateTimeFormat('en-CA',{ timeZone: tz }).format(date)` (yields `YYYY-MM-DD`, no new
  dep). Default tz = `America/Los_Angeles` if absent.
- The Heatmap must key/render cells using the SAME tz (frontend sends its own
  `Intl.DateTimeFormat().resolvedOptions().timeZone`).

## Sync accuracy (backend)
- `runSync`/`runPageSync` select each file together with its `owner_user_id` and resolve
  that owner's `access_token` (refreshing if expired). Tokens are per file owner, never a
  single shared account.
- Forward sync (`getFileVersionsPage(fileKey, null, token)`) **pages backward** until it
  hits an already-known `version_id` (or a safety cap), so bursts >30 versions aren't lost.
- Token refresh: `figmaService.js` POSTs `grant_type=refresh_token` to Figma's token
  endpoint when `token_expires_at` is near/past, then persists the new token + expiry.

## Routing & subdomain
- Single-origin by default (marketing + dashboard + API on one Render service). An
  optional SEO split puts marketing/landing on the ROOT domain and the dashboard app on
  an `app.` subdomain.
- Frontend decides mode by hostname: if `window.location.hostname` starts with `app.`
  (or `import.meta.env.VITE_IS_APP === '1'`), render the dashboard app; otherwise render
  the landing page. Root-domain visits that are logged in should offer/redirect to the app
  subdomain; app-subdomain visits that are NOT logged in redirect to OAuth start.
- Logged-in users hitting the app root auto-redirect to `/dashboard`.
- DNS + Render custom-domain wiring is a manual operator step; see `DEPLOYMENT.md` §4.

## Env vars (names are fixed by this contract)
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`,
`FIGMA_OAUTH_REDIRECT_URI` (prod = `https://<your-service>.onrender.com/api/oauth/callback`),
`APP_URL` (root site), `APP_DASHBOARD_URL` (app subdomain; optional single-origin),
`SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY` (encrypts Figma OAuth tokens at rest; server
refuses to start without it), `CRON_SECRET` (auth for external-cron sync endpoints),
`FIGMA_WEBHOOK_PASSCODE` (auth for `POST /api/webhook` deliveries),
`RESIDENT_SYNC` (`off` when an external cron drives sync). Local-only: `DEV_LOGIN=1`
unlocks the localhost OAuth bypass.
Frontend build: `VITE_API_URL`, `VITE_APP_DASHBOARD_URL`, `VITE_IS_APP`.
See `.env.example` for the full list with placeholder values.
