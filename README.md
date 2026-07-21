# Figma Activity Tracker V3

GitHub-style activity tracker for Figma files. Users log in with **Figma OAuth**, track their own files, and get a visual dashboard of their design activity. A continuous background service syncs version history to a Supabase database, and users can publish a public profile + embeddable activity widgets.

## Features

- **GitHub-Style Contributions**: Visualize your Figma edits over time with a premium activity heatmap.
- **Multi-Account**: Log in with Figma OAuth; every user sees and tracks only their own files.
- **Multi-File Tracking**: Monitor multiple Figma files simultaneously from a unified dashboard.
- **Public Profiles & Embeds**: Publish a read-only heatmap under a URL-safe slug, with embeddable activity widgets.
- **Adaptive Syncing**: Background service that adjusts polling frequency based on activity, or runs from an external cron on free hosts.
- **Detailed History**: Tracks version labels, descriptions, and designer attribution.
- **Encrypted Tokens**: Figma OAuth tokens are encrypted at rest (AES-256-GCM).

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS V4, Lucide React, `react-colorful`.
- **Backend**: Node.js, Express, `node-cron`.
- **Database**: Supabase (PostgreSQL).
- **APIs**: Figma API (Version History, Files, User).

## Setup

### 1. Prerequisites

- A [Supabase](https://supabase.com/) project (run `schema.sql` in the SQL Editor).
- A [Figma OAuth app](https://www.figma.com/developers/api#oauth2) (client id + secret).
- Node.js installed locally.

### 2. Environment Variables

Copy `.env.example` to `.env` in the root directory and fill in your own values:

```env
PORT=3001

# Supabase — use the service_role key for server-side writes
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Figma OAuth app
FIGMA_CLIENT_ID=your_figma_client_id
FIGMA_CLIENT_SECRET=your_figma_client_secret
FIGMA_OAUTH_REDIRECT_URI=http://localhost:5173/api/oauth/callback
APP_URL=http://localhost:5173

# Secrets (generate with: openssl rand -hex 32)
SESSION_SECRET=your_session_secret
TOKEN_ENCRYPTION_KEY=your_token_encryption_key   # >=32 chars; encrypts Figma tokens at rest

# Local dev only: unlocks GET /api/oauth/dev-login to bypass Figma OAuth on localhost
DEV_LOGIN=1
```

See `DEPLOYMENT.md` for the full production variable list (Render).

### 3. Installation & Development

```bash
# Install dependencies
npm install

# Start both frontend (Vite) and backend (Express) concurrently
npm run dev
```

The application will be available at `http://localhost:5173` (Vite dev server) with the backend running at `http://localhost:3001`.

## Project Structure

- `backend/`: Core logic for API routes and the sync service.
  - `syncService.js`: Intelligent version fetching and Supabase integration.
  - `figmaService.js`: Figma API communication layer.
  - `routes/`: Express API endpoints (sync, oauth, user).
- `src/`: React frontend application.
  - `pages/`: Dashboard, Embed, Files, and Profile views.
  - `components/`: Sidebar, Footer, Heatmap, and UI primitives.
  - `useFigmaData.ts`: Custom hook for data fetching and state management.
- `server.js`: Express entry point — serves the built frontend + `/api`, and runs the resident sync loop. Deployed on Render (`npm start`).

## Sync Logic

- **Adaptive Page Sync**: Checks for new versions every 2s when active, slowing down to 10s when idle to optimize API usage.
- **Full Sync**: Scheduled daily check to ensure data consistency.
- **Resident or external cron**: On an always-on host the loop runs in-process; on free hosts set `RESIDENT_SYNC=off` and drive `GET /api/sync/incremental` from an external scheduler. Sync state lives in Supabase, so either mode is safe to restart.

## License

Released under the MIT License. See `LICENSE` for the full text.
