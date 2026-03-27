-- Users table: created on first OAuth login
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,        -- Google sub (stable across sessions)
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  image      TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Background removal jobs
CREATE TABLE IF NOT EXISTS removal_jobs (
  id         TEXT PRIMARY KEY,        -- UUID v4
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  filename   TEXT NOT NULL,
  provider   TEXT NOT NULL,           -- 'removebg' | 'mock'
  status     TEXT NOT NULL,           -- 'success' | 'failed'
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_removal_jobs_user_id ON removal_jobs(user_id, created_at DESC);

-- Monthly usage counters (avoids full table scan)
CREATE TABLE IF NOT EXISTS usage_monthly (
  user_id    TEXT NOT NULL,
  year_month TEXT NOT NULL,           -- '2026-03'
  count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year_month)
);
