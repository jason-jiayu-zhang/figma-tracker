-- ============================================================
-- Migration: comments + dev resources (Tier 2 analytics)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (IF NOT EXISTS throughout).
-- ============================================================

CREATE TABLE IF NOT EXISTS file_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES figma_files(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL,
  parent_comment_id TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  author_figma_user_id TEXT,
  author_handle TEXT,
  UNIQUE(file_id, comment_id)
);

CREATE TABLE IF NOT EXISTS dev_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES figma_files(id) ON DELETE CASCADE,
  dev_resource_id TEXT NOT NULL,
  name TEXT,
  url TEXT,
  node_id TEXT,
  UNIQUE(file_id, dev_resource_id)
);

CREATE INDEX IF NOT EXISTS idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_created_at ON file_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_dev_resources_file_id ON dev_resources(file_id);
