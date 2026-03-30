-- Migration 0002: user plans & subscriptions

-- Add plan fields to users
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_expires_at INTEGER;  -- NULL = no expiry (free)
ALTER TABLE users ADD COLUMN credits_total INTEGER NOT NULL DEFAULT 3;  -- registration bonus
ALTER TABLE users ADD COLUMN credits_used INTEGER NOT NULL DEFAULT 0;

-- Subscriptions table (for PayPal integration later)
CREATE TABLE IF NOT EXISTS subscriptions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL,        -- 'pro_monthly' | 'pro_yearly'
  status       TEXT NOT NULL,        -- 'active' | 'cancelled' | 'expired'
  started_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  payment_ref  TEXT,                 -- PayPal order/subscription id (future)
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id, expires_at DESC);
