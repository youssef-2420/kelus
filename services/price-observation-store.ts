import type { PriceObservation } from "@/types/kelus";

type ObservationStatement = {
  bind(...values: unknown[]): ObservationStatement;
  all<T>(): Promise<{ results: T[] }>;
};

export type ObservationDatabase = {
  prepare(query: string): ObservationStatement;
  batch(statements: ObservationStatement[]): Promise<Array<{ meta: { changes?: number } }>>;
};

type StoredObservation = {
  offer_id: string;
  variant_id: string;
  provider_id: string;
  retailer_id: string;
  price_cents: number;
  shipping_cents: number | null;
  condition: PriceObservation["condition"];
  availability: PriceObservation["availability"];
  observed_at: string;
};

async function ensureObservationSchema(db: ObservationDatabase) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS price_observations (
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
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS price_observations_provider_offer_time_unique ON price_observations (provider_id, offer_id, observed_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS price_observations_variant_time_idx ON price_observations (variant_id, observed_at)"),
  ]);
}

export async function storeLivePriceObservations(db: ObservationDatabase, canonicalProductId: string, observations: PriceObservation[]) {
  const live = observations.filter((observation) => !observation.isDemo
    && observation.variantId
    && observation.providerId
    && observation.retailerId
    && observation.condition
    && observation.availability
    && Number.isFinite(observation.price)
    && !Number.isNaN(Date.parse(observation.timestamp)));
  if (!live.length) return 0;
  await ensureObservationSchema(db);
  const statements = live.map((observation) => db.prepare(`INSERT OR IGNORE INTO price_observations (
    canonical_product_id, variant_id, provider_id, retailer_id, offer_id, price_cents,
    shipping_cents, currency, condition, availability, observed_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      canonicalProductId,
      observation.variantId,
      observation.providerId,
      observation.retailerId,
      observation.offerId,
      Math.round(observation.price * 100),
      observation.shippingCost === null || observation.shippingCost === undefined ? null : Math.round(observation.shippingCost * 100),
      "USD",
      observation.condition,
      observation.availability,
      observation.timestamp,
    ));
  const results = await db.batch(statements);
  return results.reduce((count, result) => count + (result.meta.changes ?? 0), 0);
}

export async function readLivePriceObservations(db: ObservationDatabase, variantId: string, limit = 500): Promise<PriceObservation[]> {
  await ensureObservationSchema(db);
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
  const result = await db.prepare(`SELECT offer_id, variant_id, provider_id, retailer_id, price_cents,
    shipping_cents, condition, availability, observed_at
    FROM price_observations
    WHERE variant_id = ?
    ORDER BY observed_at DESC
    LIMIT ?`).bind(variantId, safeLimit).all<StoredObservation>();
  return result.results.map((row) => ({
    id: `${row.provider_id}-${row.offer_id}-${row.observed_at}`,
    offerId: row.offer_id,
    variantId: row.variant_id,
    providerId: row.provider_id,
    retailerId: row.retailer_id,
    price: row.price_cents / 100,
    shippingCost: row.shipping_cents === null ? null : row.shipping_cents / 100,
    condition: row.condition,
    availability: row.availability,
    timestamp: row.observed_at,
    isDemo: false,
  }));
}
