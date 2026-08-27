import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";

type SnapshotStatement = {
  bind(...values: unknown[]): SnapshotStatement;
  first?<T>(): Promise<T | null>;
  run?(): Promise<unknown>;
  all?<T>(): Promise<{ results?: T[] }>;
};

export type ProductIntelligenceSnapshotDatabase = {
  prepare(query: string): SnapshotStatement;
};

type SnapshotRow = { result_json: string; fetched_at: string };
type MemorySnapshotRow = SnapshotRow & { cached_at: number };
type DueSnapshotRow = { cache_key: string; variant_id: string; condition: string; market: string };
const defaultMaximumAgeMs = 7 * 24 * 60 * 60 * 1_000;
const defaultRefreshAgeMs = 5 * 60 * 1_000;
const memorySnapshotTtlMs = 60_000;
const memorySnapshots = new Map<string, MemorySnapshotRow>();

export function productIntelligenceSnapshotKey(criteria: SearchCriteria) {
  return [criteria.productSlug, criteria.variantId ?? "", criteria.condition, criteria.market].join(":");
}

export async function listProductIntelligenceSnapshotsDue(
  database: ProductIntelligenceSnapshotDatabase,
  before: string,
  limit = 20,
): Promise<SearchCriteria[]> {
  const statement = database.prepare(`SELECT cache_key, variant_id, condition, market
    FROM product_intelligence_snapshots
    WHERE updated_at <= ?
    ORDER BY updated_at ASC
    LIMIT ?`)
    .bind(before, Math.max(1, Math.min(100, Math.floor(limit))));
  if (!statement.all) return [];
  const response = await statement.all<DueSnapshotRow>();
  return [...new Map((response.results ?? []).flatMap((row) => {
    const productSlug = row.cache_key.split(":", 1)[0];
    if (!productSlug || row.market !== "us" || !["any", "new", "used", "refurbished"].includes(row.condition)) return [];
    const criteria = {
      productSlug,
      variantId: row.variant_id || undefined,
      condition: row.condition as SearchCriteria["condition"],
      market: "us" as const,
    };
    return [[productIntelligenceSnapshotKey(criteria), criteria] as const];
  })).values()];
}

export function clearProductIntelligenceSnapshotMemory() {
  memorySnapshots.clear();
}

function persistedResult(result: OfferSearchResult, attemptedAt: string): OfferSearchResult {
  return {
    ...result,
    observations: [],
    observationsStored: false,
    servedFromCache: undefined,
    refreshRecommended: undefined,
    snapshotState: undefined,
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshFailed: false,
    lastRefreshReturnedEmpty: false,
  };
}

async function readRawSnapshot(database: ProductIntelligenceSnapshotDatabase, key: string) {
  const cached = memorySnapshots.get(key);
  if (cached && Date.now() - cached.cached_at <= memorySnapshotTtlMs) return cached;
  if (cached) memorySnapshots.delete(key);
  const statement = database.prepare(`SELECT result_json, fetched_at
    FROM product_intelligence_snapshots
    WHERE cache_key = ?
    LIMIT 1`)
    .bind(key);
  if (!statement.first) return null;
  const row = await statement.first<SnapshotRow>();
  if (row) memorySnapshots.set(key, { ...row, cached_at: Date.now() });
  return row;
}

async function updateRefreshMetadata(
  database: ProductIntelligenceSnapshotDatabase,
  criteria: SearchCriteria,
  metadata: Pick<OfferSearchResult, "lastRefreshAttemptAt" | "lastRefreshFailed" | "lastRefreshReturnedEmpty">,
) {
  const key = productIntelligenceSnapshotKey(criteria);
  const row = await readRawSnapshot(database, key);
  if (!row) return false;
  try {
    const current = JSON.parse(row.result_json) as OfferSearchResult;
    const resultJson = JSON.stringify({ ...current, ...metadata });
    const statement = database.prepare(`UPDATE product_intelligence_snapshots
      SET result_json = ?, updated_at = ?
      WHERE cache_key = ?`)
      .bind(resultJson, metadata.lastRefreshAttemptAt ?? new Date().toISOString(), key);
    if (!statement.run) return false;
    await statement.run();
    memorySnapshots.set(key, { ...row, result_json: resultJson, cached_at: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export function staleSnapshotAfterRefresh(
  snapshot: OfferSearchResult | null,
  status: "failed" | "empty",
  attemptedAt = new Date().toISOString(),
) {
  if (!snapshot?.offers.length) return null;
  return {
    ...snapshot,
    servedFromCache: true,
    refreshRecommended: true,
    snapshotState: snapshot.snapshotState === "expired" ? "expired" as const : "stale" as const,
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshFailed: status === "failed",
    lastRefreshReturnedEmpty: status === "empty",
  };
}

export async function markProductIntelligenceRefreshFailure(
  database: ProductIntelligenceSnapshotDatabase,
  criteria: SearchCriteria,
  attemptedAt = new Date().toISOString(),
) {
  return updateRefreshMetadata(database, criteria, {
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshFailed: true,
    lastRefreshReturnedEmpty: false,
  });
}

export async function markProductIntelligenceRefreshEmpty(
  database: ProductIntelligenceSnapshotDatabase,
  criteria: SearchCriteria,
  attemptedAt = new Date().toISOString(),
) {
  return updateRefreshMetadata(database, criteria, {
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshFailed: false,
    lastRefreshReturnedEmpty: true,
  });
}

export async function storeProductIntelligenceSnapshot(
  database: ProductIntelligenceSnapshotDatabase,
  canonicalProductId: string,
  criteria: SearchCriteria,
  result: OfferSearchResult,
) {
  if (result.isDemo) return false;
  const key = productIntelligenceSnapshotKey(criteria);
  if (!result.offers.length) {
    const existing = await readProductIntelligenceSnapshot(database, criteria, { maximumAgeMs: Number.POSITIVE_INFINITY });
    if (existing?.offers.length) {
      await markProductIntelligenceRefreshEmpty(database, criteria, result.lastUpdated);
      return false;
    }
  }
  const fetchedAt = result.lastUpdated && !Number.isNaN(Date.parse(result.lastUpdated))
    ? result.lastUpdated
    : new Date().toISOString();
  const resultJson = JSON.stringify(persistedResult(result, fetchedAt));
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
      key,
      canonicalProductId,
      criteria.variantId ?? "",
      criteria.condition,
      criteria.market,
      resultJson,
      fetchedAt,
      new Date().toISOString(),
    );
  if (!statement.run) return false;
  await statement.run();
  memorySnapshots.set(key, { result_json: resultJson, fetched_at: fetchedAt, cached_at: Date.now() });
  return true;
}

export async function readProductIntelligenceSnapshot(
  database: ProductIntelligenceSnapshotDatabase,
  criteria: SearchCriteria,
  options: { maximumAgeMs?: number; refreshAgeMs?: number; now?: () => number } = {},
): Promise<OfferSearchResult | null> {
  const key = productIntelligenceSnapshotKey(criteria);
  const row = await readRawSnapshot(database, key);
  if (!row || Number.isNaN(Date.parse(row.fetched_at))) return null;
  const ageMs = (options.now ?? Date.now)() - Date.parse(row.fetched_at);
  if (ageMs < 0) {
    memorySnapshots.delete(key);
    return null;
  }
  try {
    const result = JSON.parse(row.result_json) as OfferSearchResult;
    if (!result || !Array.isArray(result.offers) || !Array.isArray(result.observations) || result.isDemo) return null;
    const snapshotState = ageMs > (options.maximumAgeMs ?? defaultMaximumAgeMs)
      ? "expired" as const
      : ageMs > (options.refreshAgeMs ?? defaultRefreshAgeMs)
        ? "stale" as const
        : "fresh" as const;
    return {
      ...result,
      lastUpdated: result.lastUpdated ?? row.fetched_at,
      servedFromCache: true,
      refreshRecommended: snapshotState !== "fresh" || result.lastRefreshFailed || result.lastRefreshReturnedEmpty,
      snapshotState,
    };
  } catch {
    return null;
  }
}
