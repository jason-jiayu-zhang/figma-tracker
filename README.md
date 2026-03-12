# Figma Activity Tracker

A sleek, GitHub-style activity tracker for Figma files. This application monitors your Figma version history, syncs edits to a Supabase database, and provides a visual dashboard of your design activity.

## To-do

- Polish UI
- Convert frontend to React TSX
- Add onboarding and login
- Limit-test API call rate

## Features

- **GitHub-Style Contributions**: Visualize your Figma edits over time with an activity heatmap.
- **Automated Syncing**: Background services fetch new versions every minute (paginated) and perform a full sweep daily.
- **Multi-File Tracking**: Monitor multiple Figma files simultaneously.
- **Detailed History**: Tracks version labels, descriptions, and the designers who made the changes.
- **Embeddable**: Includes an embeddable script to show your activity on other sites.

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **API**: Figma API (Version History, Files, User)
- **Scheduling**: `node-cron` & internal interval timers

## Setup

### 1. Prerequisites
- A [Supabase](https://supabase.com/) project.
- A [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens).
- Node.js installed locally.

### 2. Database Initialization
Run the contents of `schema.sql` in your Supabase SQL Editor to create the necessary tables and indexes:
- `users`, `teams`, `figma_files`
- `file_versions`, `sync_sessions`, `daily_activity`

### 3. Environment Variables
Create a `.env` file in the root directory:

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
FIGMA_TOKEN=your_figma_personal_access_token
FIGMA_FILE_KEYS=file_key_1,file_key_2
```

### 4. Installation
```bash
npm install
```

### 5. Running the App
```bash
npm run dev
```
The server will start at `http://localhost:3001`.

## 📂 Project Structure

- `server.js`: Main entry point, sets up Express and cron jobs.
- `src/syncService.js`: Core logic for fetching Figma versions and upserting to Supabase.
- `src/figmaService.js`: Wrapper for Figma API requests.
- `src/supabaseClient.js`: Supabase initialization.
- `public/`: Frontend dashboard and assets.
- `schema.sql`: Database schema definition.

## 🔄 Sync Logic

- **Page Sync (Every 10s)**: Fetches the next page of 30 older versions for each file until history is complete. Persistent state is tracked in `pagination_state.json`.
- **Full Sync (Daily at Midnight)**: Performs a full check for any missing version data.
