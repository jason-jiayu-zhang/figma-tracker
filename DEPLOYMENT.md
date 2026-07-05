# Deployment Guide

This app has a **dynamic Node/Express backend** with a **continuous Figma sync**, plus
a Vite/React frontend. The backend and sync are **stateful and long-running**, so they
run on **Railway** — this is the canonical production target.

> **Vercel note:** Vercel cannot host the dynamic backend or the continuous sync
> (serverless functions are short-lived/stateless). `vercel.json` is therefore
> configured to serve the **static frontend only**. If you deploy the frontend to
> Vercel, point `VITE_API_URL` at the Railway origin. There is **no cron on Vercel**
> and `api/index.js` is a legacy, unused wrapper. All API + sync traffic goes to Railway.

Live deployment: https://figma-tracker-production.up.railway.app/

---

## 1. Railway setup

The Railway service runs the Express server directly:

- **Start command:** `npm start` (runs `node server.js`)
- **Build command:** `npm run build` (produces `dist/` which the server serves statically)
- Node listens on `process.env.PORT` (Railway injects this) and falls back to `3001` locally.

### Environment variables to set in Railway

Set every variable below in the Railway service (Variables tab). Names are fixed by
`ARCHITECTURE_SPEC.md` — **do not rename**. Values are secrets; set them in the Railway
dashboard, never commit them.

| Variable | Purpose / production value shape |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (server-side only) |
| `FIGMA_CLIENT_ID` | Figma OAuth app client id |
| `FIGMA_CLIENT_SECRET` | Figma OAuth app client secret |
| `FIGMA_OAUTH_REDIRECT_URI` | `https://<railway-domain>/api/oauth/callback` (must match the Figma app) |
| `APP_URL` | Root/marketing site origin, e.g. `https://example.com` |
| `APP_DASHBOARD_URL` | Dashboard app subdomain origin, e.g. `https://app.example.com` |
| `SESSION_SECRET` | Long random string used to sign the `ft_session` JWT. Generate with e.g. `openssl rand -hex 32`. **Never reuse the dev placeholder.** |
| `CRON_SECRET` | Shared secret that authorizes the cron-triggered sync endpoints. Generate with `openssl rand -hex 32`. Required whenever sync is driven by an external scheduler (see §6). |
| `RESIDENT_SYNC` | Set to `off` on a host driven by an external cron (§6) so the always-on in-process loop does **not** run. Leave unset to keep the resident adaptive loop (Railway always-on model). |

Frontend build-time variables (must be present at build time — set them in Railway too,
or in the Vercel project if the frontend is built there):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API origin the browser calls. If frontend and backend share the Railway origin, this can be empty (relative `/api`); if the frontend is on a different origin, set it to the Railway/app origin. |
| `VITE_IS_APP` | `1` on the dashboard-app deploy so it renders the dashboard; unset/`0` on the marketing deploy. |

> Reminder: the dev `.env` in the repo is local-only and git-ignored. Production secrets
> live exclusively in Railway (and Supabase). Do not paste real secret values into this file.

### ⚠️ Free-tier peak-hour deploy restriction

On the Railway **free/trial plan**, deploys to `us-east4-eqdc4a` are **blocked during peak
hours (8 AM – 8 PM America/New_York)**. A push during that window fails with:

```
Free-tier deploys to us-east4-eqdc4a are not available during peak hours
(8 AM – 8 PM America/New_York). Please try again later or upgrade your plan.
```

This is a Railway plan limit, **not** an app/config error — nothing to debug in the code.
Options:

- **Upgrade to Hobby ($5/mo)** — removes the restriction entirely and adds build/runtime
  resources (also avoids Vite-build OOM on the small free builder). Recommended for
  production since updates often ship during the day.
- **Deploy off-peak** — push before 8 AM or after 8 PM ET.
- **Try another region** — Service → **Settings → Region**; the block is scoped to
  `us-east4-eqdc4a`, so a different region *may* let a free deploy through (not guaranteed
  trial-wide).

---

## 2. Figma OAuth app configuration

1. In the Figma developer settings, open your OAuth app (the one whose client id/secret
   are set above).
2. Register the **callback / redirect URL** exactly as:

   ```
   https://<railway-domain>/api/oauth/callback
   ```

   This must byte-for-byte match `FIGMA_OAUTH_REDIRECT_URI` in Railway. Add a second
   redirect for local dev if Figma allows multiple: `http://localhost:5173/api/oauth/callback`.
3. **Publish the OAuth app.** An unpublished Figma OAuth app only works for members of the
   owning team. To let arbitrary (non-team) users log in, the app **must be published**.

---

## 3. Supabase migration

Apply the additive multi-account migration to the live database.

1. Open the Supabase project → **SQL Editor**.
2. Paste the contents of `migration_multiaccount.sql` and run it. It is additive
   (adds `profile_slug`, `public_enabled`, `owner_user_id`, swaps the global
   `file_key UNIQUE` for `UNIQUE(owner_user_id, file_key)`, and backfills
   `owner_user_id`). It does **not** drop existing columns or data.
3. Verify the new columns/constraints exist, then redeploy the Railway backend so it
   uses the new schema.

(Alternatively, with the Supabase CLI: `psql "$SUPABASE_DB_URL" -f migration_multiaccount.sql`.)

---

## 4. Manual DNS + custom domains (root = marketing, `app.` = dashboard)

For SEO, the **root domain serves the marketing/landing page** and the **`app.` subdomain
serves the dashboard app**. Both can be the same Railway backend (the frontend picks
marketing vs dashboard by hostname / `VITE_IS_APP`), or two deploys. Wire the domains
manually — the app does not touch DNS.

### In Railway
1. Service → **Settings → Networking → Custom Domain**.
2. Add the root domain (`example.com`) and note the target host Railway shows
   (a `*.up.railway.app` CNAME target, or an A/ALIAS record for the apex).
3. Add the `app.example.com` custom domain and note its CNAME target too.

### In your DNS provider
4. **Apex / root** (`example.com`): apex records can't be a plain CNAME. Use your
   provider's ALIAS/ANAME/flattened-CNAME to the Railway target, or the A record Railway
   provides. This host serves the **marketing** site.
5. **`app` subdomain**: add a `CNAME` record `app` → the Railway target for the app domain.
   This host serves the **dashboard**.
6. Wait for DNS propagation; Railway will provision TLS certificates automatically once
   the records resolve.

### After DNS resolves
7. Set `APP_URL=https://example.com` and `APP_DASHBOARD_URL=https://app.example.com` in Railway.
8. Update the Figma OAuth redirect (`FIGMA_OAUTH_REDIRECT_URI`) to the domain that hosts
   the backend/OAuth routes, and re-verify it matches the Figma app registration.
9. Ensure the dashboard-app deploy/build has `VITE_IS_APP=1` and the marketing deploy does not.

---

## 5. Post-deploy smoke test

- Visit `https://app.example.com` → should redirect to Figma OAuth when logged out.
- Complete OAuth → lands on `/dashboard`, `ft_session` cookie set (httpOnly, Secure, SameSite=Lax).
- `GET /api/user/me` returns the logged-in user (not 401).
- Root domain `https://example.com` shows the marketing page.
- Confirm the continuous sync is running in the Railway logs.

---

## 6. Free alternative: Render + external cron ($0, "every few minutes" sync)

Railway's always-on model runs the in-process sync loop, which requires a
paid/always-on host. If you don't need sub-minute freshness, you can run the app
on a **free** host and drive sync with a **free external scheduler** every few
minutes. This avoids Railway's Hobby fee and its free-tier peak-hour deploy block.

**How it works:** the sync loop is gated by `RESIDENT_SYNC` (`server.js`). With
`RESIDENT_SYNC=off`, the process just serves HTTP and idles; an external cron
hits `GET /api/sync/incremental` on a schedule, and that endpoint is protected by
`CRON_SECRET` (`protectCron` in `backend/routes/api.js`).

### 6.1 Host on Render (free web service)
1. Render Dashboard → **New → Web Service** → connect this repo.
2. **Build command:** `npm run build` · **Start command:** `npm start`.
3. Set **all** the env vars from §1, **plus**:
   - `RESIDENT_SYNC=off`
   - `CRON_SECRET=<output of `openssl rand -hex 32`>`
4. Deploy. Note the service URL, e.g. `https://figma-tracker.onrender.com`.
   - Update `FIGMA_OAUTH_REDIRECT_URI` and the Figma app registration to this host.
   - Render's free web service sleeps after ~15 min idle; the cron ping below
     keeps it warm (a ≤14 min interval means it effectively never sleeps).
   - (Koyeb's free web service works the same way and does not force-sleep.)

### 6.2 Schedule the sync (cron-job.org, free)
1. Create an account at https://cron-job.org → **Create cronjob**.
2. **URL:** `https://<your-host>/api/sync/incremental`
3. **Schedule:** every 3–5 minutes (1-minute granularity is supported).
4. **Request headers:** add `Authorization: Bearer <your CRON_SECRET>`.
   - Alternatively pass it as a query param: `.../api/sync/incremental?key=<CRON_SECRET>`.
5. (Optional) Add a second job hitting `GET /api/sync` (full sync) once a day.

GitHub Actions `schedule:` works too, but its minimum is ~5 min and runs are
often delayed under load — cron-job.org is more punctual for this.

### 6.3 Verify
- `curl -s -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/sync/incremental`
  → `{"ok":true,"updateFound":...}`. Without the header → `401 Unauthorized`.
- Confirm the cron-job.org execution history shows `200` responses.

> Security note: `protectCron` allows the request **unauthenticated** only when
> `CRON_SECRET` is unset and the host is not Vercel (i.e. local dev). Always set
> `CRON_SECRET` in any internet-facing deployment, or the sync endpoints are open.
