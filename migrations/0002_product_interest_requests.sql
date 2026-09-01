CREATE TABLE IF NOT EXISTS product_interest_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  normalized_query TEXT NOT NULL,
  raw_query TEXT,
  email TEXT NOT NULL,
  user_id TEXT,
  source TEXT NOT NULL DEFAULT 'unsupported_search',
  created_at TEXT NOT NULL,
  notified_at TEXT
);
CREATE INDEX IF NOT EXISTS product_interest_query_idx ON product_interest_requests (normalized_query, created_at);
CREATE INDEX IF NOT EXISTS product_interest_user_idx ON product_interest_requests (user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS product_interest_active_unique
  ON product_interest_requests (normalized_query, user_id, email)
  WHERE notified_at IS NULL;
