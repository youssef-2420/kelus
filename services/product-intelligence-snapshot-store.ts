import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";

type SnapshotStatement = {
  bind(...values: unknown[]): SnapshotStatement;
  first?<T>(): Promise<T | null>;
  run?(): Promise<unknown>;
};

export type ProductIntelligenceSnapshotDatabase = {
  prepare(query: string): SnapshotStatement;
};

type SnapshotRow = { result_json: string; fetched_at: string };
const defaultMaximumAgeMs = 24 * 60 * 60 * 1_000;
const defaultRefreshAgeMs = 5 * 60 * 1_000;

export function productIntelligenceSnapshotKey(criteria: SearchCriteria) {
  return [criteria.productSlug, criteria.variantId ?? "", criteria.condition, criteria.market].join(":");
}

function persistedResult(result: OfferSearchResult): OfferSearchResult {
  return {
    ...result,
    observations: [],
    observationsStored: false,
    servedFromCache: undefined,
    refreshRecommended: undefined,
  };
}

export async function storeProductIntelligenceSnapshot(
  database: ProductIntelligenceSnapshotDatabase,
  canonicalProductId: string,
  criteria: SearchCriteria,
  result: OfferSearchResult,
) {
  if (!result.offers.length || result.isDemo) return false;
  const fetchedAt = result.lastUpdated && !Number.isNaN(Date.parse(result.lastUpdated))
    ? result.lastUpdated
    : new Date().toISOString();
  const statement = database.prepare(`INSERT INTO product_intelligence_snapshots (
    cache_key, canonical_product_id, variant_id, condition, market, result_json, fetched_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(cache_key) DO UPDATE SET
    canonical_product_id = excluded.canonical_product_id,
    variant_id = excluded.variant_id,
    condition = excluded.condition,
    market = excluded.market,
    result_json = excluded.result_json,
    fetched_at = excluded.fetched_at,
    updated_at = excluded.updated_at`)
    .bind(
      productIntelligenceSnapshotKey(criteria),
      canonicalProductId,
      criteria.variantId ?? "",
      criteria.condition,
      criteria.market,
      JSON.stringify(persistedResult(result)),
      fetchedAt,
      new Date().toISOString(),
    );
  if (!statement.run) return false;
  await statement.run();
  return true;
}

export async function readProductIntelligenceSnapshot(
  database: ProductIntelligenceSnapshotDatabase,
  criteria: SearchCriteria,
  options: { maximumAgeMs?: number; refreshAgeMs?: number; now?: () => number } = {},
): Promise<OfferSearchResult | null> {
  const statement = database.prepare(`SELECT result_json, fetched_at
    FROM product_intelligence_snapshots
    WHERE cache_key = ?
    LIMIT 1`)
    .bind(productIntelligenceSnapshotKey(criteria));
  if (!statement.first) return null;
  const row = await statement.first<SnapshotRow>();
  if (!row || Number.isNaN(Date.parse(row.fetched_at))) return null;
  const ageMs = (options.now ?? Date.now)() - Date.parse(row.fetched_at);
  if (ageMs < 0 || ageMs > (options.maximumAgeMs ?? defaultMaximumAgeMs)) return null;
  try {
    const result = JSON.parse(row.result_json) as OfferSearchResult;
    if (!result || !Array.isArray(result.offers) || !Array.isArray(result.observations) || result.isDemo) return null;
    return {
      ...result,
      lastUpdated: result.lastUpdated ?? row.fetched_at,
      servedFromCache: true,
      refreshRecommended: ageMs > (options.refreshAgeMs ?? defaultRefreshAgeMs),
    };
  } catch {
    return null;
  }
}
