-- ============================================================
-- Multi-Account Rearchitecture — ADDITIVE migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- SAFE / ADDITIVE: adds columns + a per-owner unique constraint and backfills
-- ownership to the single existing user. Does NOT drop columns or data.
-- Idempotent where possible (IF NOT EXISTS / IF EXISTS guards).
-- ============================================================

-- 1. users: public profile fields ---------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_slug TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT false;

-- Unique slug (partial-safe: NULLs are allowed and don't collide).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_slug_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_profile_slug_key UNIQUE (profile_slug);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug);

-- 2. figma_files: per-owner ownership -----------------------------------
ALTER TABLE figma_files
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill existing rows to the single current user (oldest user row).
UPDATE figma_files
SET owner_user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE owner_user_id IS NULL;

-- 3. Swap the global file_key UNIQUE for a per-owner UNIQUE -------------
-- Drop the old global unique on file_key (default name: figma_files_file_key_key).
ALTER TABLE figma_files DROP CONSTRAINT IF EXISTS figma_files_file_key_key;

-- Add the per-owner unique constraint (owner_user_id, file_key).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'figma_files_owner_user_id_file_key_key'
  ) THEN
    ALTER TABLE figma_files
      ADD CONSTRAINT figma_files_owner_user_id_file_key_key UNIQUE (owner_user_id, file_key);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_figma_files_owner ON figma_files(owner_user_id);

-- file_versions / daily_activity: unchanged (keyed by file_id).
