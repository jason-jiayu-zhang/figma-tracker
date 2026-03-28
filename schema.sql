-- ============================================================
-- Figma Activity Tracker — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Track Figma user info
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  figma_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  handle TEXT,
  email TEXT,
  img_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  scopes TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store OAuth states for CSRF protection and session data
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams the user belongs to
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  figma_team_id TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracked Figma files
CREATE TABLE IF NOT EXISTS figma_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key TEXT UNIQUE NOT NULL,
  name TEXT,
  team_id UUID REFERENCES teams(id),
  project_id TEXT,
  project_name TEXT,
  thumbnail_url TEXT,
  last_modified TIMESTAMPTZ,
  sync_cursor TEXT,
  sync_completed BOOLEAN DEFAULT FALSE,
  last_sync_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Every version entry from GET /v1/files/:key/versions
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES figma_files(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL,
  label TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  created_by_figma_user_id TEXT,
  created_by_handle TEXT,
  UNIQUE(file_id, version_id)
);

-- Sync run audit log
CREATE TABLE IF NOT EXISTS sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  files_synced INT DEFAULT 0,
  new_versions_found INT DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT
);

-- Daily aggregate: version count per file per day
CREATE TABLE IF NOT EXISTS daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES figma_files(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  version_count INT DEFAULT 0,
  UNIQUE(file_id, activity_date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_created_at ON file_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_file_id ON daily_activity(file_id);
