CREATE TABLE IF NOT EXISTS price_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  retailer_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  shipping_cents INTEGER,
  currency TEXT NOT NULL,
  condition TEXT NOT NULL,
  availability TEXT NOT NULL,
  observed_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS price_observations_provider_offer_time_unique ON price_observations (provider_id, offer_id, observed_at);
CREATE INDEX IF NOT EXISTS price_observations_variant_time_idx ON price_observations (variant_id, observed_at);
CREATE INDEX IF NOT EXISTS price_observations_product_variant_condition_time_idx ON price_observations (canonical_product_id, variant_id, condition, observed_at);

CREATE TABLE IF NOT EXISTS product_intelligence_snapshots (
  cache_key TEXT PRIMARY KEY,
  canonical_product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  market TEXT NOT NULL,
  result_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS product_intelligence_snapshots_updated_idx ON product_intelligence_snapshots (updated_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  product_slug TEXT,
  variant_id TEXT,
  condition TEXT,
  offer_id TEXT,
  query TEXT,
  offer_count INTEGER,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx ON analytics_events (event_name, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_product_time_idx ON analytics_events (product_slug, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_offer_outcome_idx ON analytics_events (event_name, offer_count, occurred_at);

CREATE TABLE IF NOT EXISTS catalog_refresh_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  completed_at TEXT NOT NULL,
  queued INTEGER NOT NULL,
  catalog_queued INTEGER NOT NULL,
  stale_queued INTEGER NOT NULL,
  refreshed INTEGER NOT NULL,
  empty INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL
);
