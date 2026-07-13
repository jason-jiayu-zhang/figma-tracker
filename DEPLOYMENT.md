# Deployment Guide

This app has a **dynamic Node/Express backend** with a **continuous Figma sync**, plus
a Vite/React frontend. The backend and sync are **stateful and long-running**, so they
run on **Render** as a single web service — this is the canonical production target.
The same service serves the built static frontend (`dist/`) and the `/api` routes.

Two ways to run the sync on Render:

- **Paid (Starter+) instance — resident loop.** The instance stays always-on, so the
  in-process adaptive sync loop in `server.js` runs continuously. Leave `RESIDENT_SYNC`
  unset. This gives near-real-time freshness (2s–10s adaptive).
- **Free instance — external cron.** Render's free web service sleeps after ~15 min
  idle and can't host an always-on loop, so set `RESIDENT_SYNC=off` and drive sync from
  a **free external scheduler** (cron-job.org) that pings `GET /api/sync/incremental`
  every few minutes (§6). The ping also keeps the free instance warm.

> **Vercel note:** Vercel cannot host the dynamic backend or the continuous sync
> (serverless functions are short-lived/stateless). `vercel.json` and `api/index.js`
> are legacy artifacts from an earlier Vercel attempt and are **not** used by the
> Render deployment. If you ever host only the static frontend on Vercel, point
> `VITE_API_URL` at the Render origin — but the default, supported setup is the single
> Render service above.

Live deployment: `https://<your-service>.onrender.com/` (e.g. `https://figma-tracker.onrender.com/`)

---

## 1. Render setup

Render Dashboard → **New → Web Service** → connect this repo (`jason-jiayu-zhang/figma-tracker`).

- **Runtime:** Node
- **Build command:** `npm run build` (produces `dist/`, which the server serves statically)
- **Start command:** `npm start` (runs `node server.js`)
- Node listens on `process.env.PORT` (Render injects this) and falls back to `3001` locally.

### Environment variables to set in Render

Set every variable below in the Render service (**Environment** tab). Names are fixed by
`ARCHITECTURE_SPEC.md` — **do not rename**. Values are secrets; set them in the Render
dashboard, never commit them.

| Variable | Purpose / production value shape |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (server-side only) |
| `FIGMA_CLIENT_ID` | Figma OAuth app client id |
| `FIGMA_CLIENT_SECRET` | Figma OAuth app client secret |
| `FIGMA_OAUTH_REDIRECT_URI` | `https://<your-service>.onrender.com/api/oauth/callback` (must match the Figma app) |
| `APP_URL` | Root/marketing site origin, e.g. `https://example.com` (or the Render URL if you use a single domain) |
| `APP_DASHBOARD_URL` | Dashboard app subdomain origin, e.g. `https://app.example.com` (optional; omit if you serve everything from one origin) |
| `SESSION_SECRET` | Long random string used to sign the `ft_session` JWT. Generate with `openssl rand -hex 32`. **Never reuse the dev placeholder.** |
| `TOKEN_ENCRYPTION_KEY` | Random string (≥32 chars) used to encrypt Figma OAuth tokens at rest (AES-256-GCM). The server **refuses to start** without it. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Use a **different** value than dev, and **do not rotate it casually** — changing it makes already-encrypted tokens undecryptable (affected users must re-auth). |
| `CRON_SECRET` | Shared secret that authorizes the cron-triggered sync endpoints. Generate with `openssl rand -hex 32`. Required whenever sync is driven by an external scheduler (see §6). |
| `RESIDENT_SYNC` | Set to `off` on a free instance driven by an external cron (§6) so the always-on in-process loop does **not** run. Leave unset on a paid/always-on instance to keep the resident adaptive loop. |

Do **not** set `DEV_LOGIN` in production. It unlocks `GET /api/oauth/dev-login`, a
localhost-only bypass of Figma OAuth; the endpoint is already gated to non-HTTPS hosts,
but leave the var unset (or `0`) on Render regardless.

Frontend build-time variables (must be present at build time — set them in Render too):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API origin the browser calls. If frontend and backend share the Render origin (the default single-service setup), leave this empty (relative `/api`); set it only if the frontend is served from a different origin. |
| `VITE_APP_DASHBOARD_URL` | Absolute URL of the dashboard app (the `app.` subdomain), used to build marketing-site CTAs and shareable profile/embed links. Omit for a single-origin setup. |
| `VITE_IS_APP` | `1` on the dashboard-app deploy so it renders the dashboard; unset/`0` on the marketing deploy. Only needed if you split marketing and app into two deploys. |

> Reminder: the dev `.env` in the repo is local-only and git-ignored. Production secrets
> live exclusively in Render (and Supabase). Do not paste real secret values into this file.

### Free-instance note

Render's **free** web service spins down after ~15 min of inactivity, so the first
request after idle is slow (cold start) and an always-on sync loop can't run. Either
upgrade to a paid instance for the resident loop, or keep the free instance and drive
sync via external cron (§6) — the periodic ping doubles as a keep-warm.

---

## 2. Figma OAuth app configuration

1. In the Figma developer settings, open your OAuth app (the one whose client id/secret
   are set above).
2. Register the **callback / redirect URL** exactly as:

   ```
   https://<your-service>.onrender.com/api/oauth/callback
   ```

   This must byte-for-byte match `FIGMA_OAUTH_REDIRECT_URI` in Render. Add a second
   redirect for local dev if Figma allows multiple: `http://localhost:5173/api/oauth/callback`.
3. **Publish the OAuth app.** An unpublished Figma OAuth app only works for members of the
   owning team. To let arbitrary (non-team) users log in, the app **must be published**.

---

## 3. Supabase schema

`schema.sql` is the single source of truth for the database (the earlier one-shot
`migration_multiaccount.sql` has been applied and removed). It is idempotent
(`CREATE TABLE IF NOT EXISTS`, etc.).

1. Open the Supabase project → **SQL Editor**.
2. Paste the contents of `schema.sql` and run it. This provisions the multi-account
   schema: `users` (with `profile_slug`, `public_enabled`, encrypted token columns),
   `figma_files` (owned per-user via `owner_user_id`, `UNIQUE(owner_user_id, file_key)`),
   `file_versions`, and `daily_activity`.
3. For an **existing** database, re-running `schema.sql` only adds what's missing; it does
   not drop existing columns or data.
4. Verify the tables/constraints exist, then (re)deploy the Render service.

(Alternatively, with `psql`: `psql "$SUPABASE_DB_URL" -f schema.sql`.)

---

## 4. Optional: custom domains (root = marketing, `app.` = dashboard)

The default single-service setup serves everything from one Render origin and needs no
custom domain. If you want the SEO split — **root domain serves marketing/landing** and
the **`app.` subdomain serves the dashboard app** — wire the domains manually (the app
does not touch DNS). The frontend picks marketing vs dashboard by hostname (`app.` prefix)
or `VITE_IS_APP`.

### In Render
1. Service → **Settings → Custom Domains → Add Custom Domain**.
2. Add the root domain (`example.com`) and the `app.example.com` subdomain; note the
   CNAME / A-record targets Render shows for each.

### In your DNS provider
3. **Apex / root** (`example.com`): apex records can't be a plain CNAME. Use your
   provider's ALIAS/ANAME/flattened-CNAME to the Render target, or the A record Render
   provides. This host serves the **marketing** site.
4. **`app` subdomain**: add a `CNAME` record `app` → the Render target for the app domain.
   This host serves the **dashboard**.
5. Wait for DNS propagation; Render provisions TLS certificates automatically once the
   records resolve.

### After DNS resolves
6. Set `APP_URL=https://example.com` and `APP_DASHBOARD_URL=https://app.example.com` in Render.
7. Update `FIGMA_OAUTH_REDIRECT_URI` to the domain that hosts the backend/OAuth routes,
   and re-verify it matches the Figma app registration.
8. If you split marketing and app into two deploys, ensure the dashboard-app deploy has
   `VITE_IS_APP=1` and the marketing deploy does not.

---

## 5. Post-deploy smoke test

- Visit the app origin logged out → should redirect to Figma OAuth (on the `app.`
  subdomain, or immediately in a single-origin setup).
- Complete OAuth → lands on `/dashboard`, `ft_session` cookie set (httpOnly, Secure, SameSite=Lax).
- `GET /api/user/me` returns the logged-in user (not 401).
- If you use the domain split, the root domain shows the marketing page.
- Confirm sync is running: on a paid instance, the Render logs show the resident loop
  (`[service-v3] Starting adaptive page sync`); on a free instance, confirm the external
  cron (§6) is hitting `/api/sync/incremental` with `200`s.

---

## 6. Free-tier sync via external cron ($0, "every few minutes")

The resident sync loop needs an always-on host. On Render's **free** instance the process
spins down when idle, so drive sync with a **free external scheduler** instead. This keeps
the whole stack at $0.

**How it works:** the sync loop is gated by `RESIDENT_SYNC` (`server.js`). With
`RESIDENT_SYNC=off`, the process just serves HTTP and idles; an external cron hits
`GET /api/sync/incremental` on a schedule, and that endpoint is protected by `CRON_SECRET`
(`protectCron` in `backend/routes/api.js`).

### 6.1 Configure the free Render instance
On the Render service from §1, additionally set:
- `RESIDENT_SYNC=off`
- `CRON_SECRET=<output of `openssl rand -hex 32`>`

Note the service URL, e.g. `https://figma-tracker.onrender.com`. The free instance sleeps
after ~15 min idle; the cron ping below keeps it warm (a ≤14 min interval means it
effectively never sleeps).

### 6.2 Schedule the sync (cron-job.org, free)
1. Create an account at https://cron-job.org → **Create cronjob**.
2. **URL:** `https://<your-service>.onrender.com/api/sync/incremental`
3. **Schedule:** every 3–5 minutes (1-minute granularity is supported).
4. **Request headers:** add `Authorization: Bearer <your CRON_SECRET>`.
   - Alternatively pass it as a query param: `.../api/sync/incremental?key=<CRON_SECRET>`.
5. (Optional) Add a second job hitting `GET /api/sync` (full sync) once a day.

GitHub Actions `schedule:` works too, but its minimum is ~5 min and runs are often
delayed under load — cron-job.org is more punctual for this.

### 6.3 Verify
- `curl -s -H "Authorization: Bearer $CRON_SECRET" https://<your-service>.onrender.com/api/sync/incremental`
  → `{"ok":true,"updateFound":...}`. Without the header → `401 Unauthorized`.
- Confirm the cron-job.org execution history shows `200` responses.

> Security note: `protectCron` allows the request **unauthenticated** only when
> `CRON_SECRET` is unset and the host is not Vercel (i.e. local dev). Always set
> `CRON_SECRET` on any internet-facing deployment, or the sync endpoints are open.
