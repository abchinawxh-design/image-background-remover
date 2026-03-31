-- Migration: Add subscriptions table and PayPal fields
-- Created: 2026-03-31

-- Create subscriptions table if not exists
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,  -- 'pro_monthly' | 'pro_yearly'
  type TEXT NOT NULL DEFAULT 'one_time',  -- 'one_time' | 'subscription'
  status TEXT NOT NULL,  -- 'active' | 'cancelled' | 'expired' | 'suspended' | 'pending'
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  payment_ref TEXT,  -- PayPal order ID or subscription ID
  paypal_order_id TEXT,
  paypal_subscription_id TEXT,
  amount REAL,
  currency TEXT DEFAULT 'USD',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_order ON subscriptions(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_sub ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status, expires_at);

-- Create PayPal webhook events log table (for audit and debugging)
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  resource_id TEXT,  -- PayPal order/subscription ID
  payload TEXT NOT NULL,  -- JSON payload
  processed BOOLEAN DEFAULT FALSE,
  processed_at INTEGER,
  error_message TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_resource ON paypal_webhook_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_type ON paypal_webhook_events(event_type, created_at DESC);

-- Create subscription payments tracking (for recurring payments)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  paypal_payment_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,  -- 'completed' | 'failed' | 'refunded'
  paid_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_subscription ON subscription_payments(subscription_id, paid_at DESC);
