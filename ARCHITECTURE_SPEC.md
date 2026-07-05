# Figma Tracker — Multi-Account Rearchitecture Contract

This is the shared contract for the backend, frontend, and deploy workstreams. All three
must conform to the names and shapes below so the pieces fit together. If you must deviate,
note it loudly in your final report.

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
- Value = JWT signed with `process.env.SESSION_SECRET` (add to Railway env), payload
  `{ uid: <users.id UUID>, fu: <figma_user_id> }`, 30-day expiry.
- Backend helper `getSessionUser(req)` reads/verifies the cookie and returns
  `{ id, figma_user_id }` or `null`. Replace ALL `.limit(1)` "first row = current user"
  logic (`user.js`, `api.js`) with this.
- Deps: add `jsonwebtoken` and `cookie-parser`. Wire `cookie-parser` in `server.js`.
- CORS: switch `cors()` to `cors({ origin: <APP_URL(s)>, credentials: true })` — a wildcard
  origin cannot be used with credentialed cookies. Frontend sends `credentials: 'include'`.

## Schema changes (additive migration — do NOT drop columns/data on live DB)
Write a new file `migration_multiaccount.sql` (additive). Also update `schema.sql`.
- `users`: add `profile_slug TEXT UNIQUE`, `public_enabled BOOLEAN NOT NULL DEFAULT false`.
- `figma_files`: add `owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE`.
  - Drop the global `file_key UNIQUE`; add `UNIQUE(owner_user_id, file_key)`.
  - Backfill existing rows' `owner_user_id` to the single current user id.
- `file_versions` / `daily_activity` unchanged in shape (keyed by file_id). Attribution
  stays via `created_by_figma_user_id`.

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

## Sync accuracy fixes (backend)
- `runSync`/`runPageSync`: select each file WITH its `owner_user_id` → resolve that owner's
  `access_token` (refreshing if expired). Use per-file token, not `users[0]`.
- Forward sync (`getFileVersionsPage(fileKey, null, token)`) must **page backward** until it
  hits an already-known `version_id` (or a safety cap), so bursts >30 versions aren't lost.
- Token refresh: add a helper in `figmaService.js` that POSTs `grant_type=refresh_token` to
  Figma's token endpoint when `token_expires_at` is near/past; persist new token + expiry.
- Fix `api.js` `/api/stats` implicit-global `user` (declare `let user = null;`).

## Routing & subdomain
- Marketing/landing on the ROOT domain; the dashboard app on an `app.` subdomain.
- Frontend decides mode by hostname: if `window.location.hostname` starts with `app.`
  (or `import.meta.env.VITE_IS_APP === '1'`), render the dashboard app; otherwise render
  the landing page. Root-domain visits that are logged in should offer/redirect to the app
  subdomain; app-subdomain visits that are NOT logged in redirect to OAuth start.
- Logged-in users hitting the app root auto-redirect to `/dashboard`.
- DNS + Railway custom-domain wiring is a MANUAL user step — document it, don't attempt DNS.

## Env vars (names are fixed by this contract)
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`,
`FIGMA_OAUTH_REDIRECT_URI` (prod = `https://<railway-domain>/api/oauth/callback`),
`APP_URL` (root site), `APP_DASHBOARD_URL` (app subdomain), `SESSION_SECRET`.
Frontend build: `VITE_API_URL`, `VITE_IS_APP`.
