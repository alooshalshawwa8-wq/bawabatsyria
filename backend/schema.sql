CREATE TABLE IF NOT EXISTS subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  current_period_end INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0,1)),
  source TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, entitlement_key)
);
CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS points_ledger_user_idx ON points_ledger(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS checkout_sessions (
  stripe_session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);