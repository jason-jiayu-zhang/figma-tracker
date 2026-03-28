# Figma Activity Tracker V3

GitHub-style activity tracker for Figma files. This application monitors your Figma version history, syncs edits to a Supabase database, and provides a visual dashboard of your design activity.

[Live Demo](https://figma-tracker-production.up.railway.app/)

## Features

- **GitHub-Style Contributions**: Visualize your Figma edits over time with a premium activity heatmap.
- **Multi-File Tracking**: Monitor multiple Figma files simultaneously from a unified dashboard.
- **Specialized Embeds**: Public-facing activity widgets with deep-linking and dynamic styling.
- **Adaptive Syncing**: Intelligent background service that adjusts polling frequency based on activity.
- **Detailed History**: Tracks version labels, descriptions, and designer attribution.
- **Vercel Ready**: Architected for serverless deployment with stateless sync management.

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS V4, Lucide React, `react-colorful`.
- **Backend**: Node.js, Express, `node-cron`.
- **Database**: Supabase (PostgreSQL).
- **APIs**: Figma API (Version History, Files, User).

## Setup

### 1. Prerequisites

- A [Supabase](https://supabase.com/) project.
- A [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens).
- Node.js installed locally.

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
FIGMA_TOKEN=your_figma_personal_access_token
```

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
- `server.js`: Entry point for local development and Vercel hosting.

## Sync Logic

- **Adaptive Page Sync**: Checks for new versions every 2s when active, slowing down to 10s when idle to optimize API usage.
- **Full Sync**: Scheduled daily check to ensure data consistency.
- **Stateless Operation**: Sync state is maintained in Supabase, allowing for reliable serverless execution.
