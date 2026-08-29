import type { SearchCriteria, OfferSearchResult } from "../types/kelus.ts";
import type { LiveOfferEnvironment } from "./server-offer-service.ts";
import { listProductIntelligenceSnapshotsDue } from "./product-intelligence-snapshot-store.ts";
import { products } from "../lib/demo-data.ts";
import { productIntelligenceSnapshotKey } from "./product-intelligence-snapshot-store.ts";

const refreshIntervalMs = 5 * 60 * 1_000;
const maxSnapshotsPerRun = 20;
const catalogSnapshotsPerRun = 16;
const catalogRotationIntervalMs = 6 * 60 * 60 * 1_000;
const concurrency = 3;

type SnapshotSearch = (
  criteria: SearchCriteria,
  environment: LiveOfferEnvironment,
  fetcher?: typeof fetch,
) => Promise<OfferSearchResult>;

export function catalogRefreshCriteria(now = Date.now(), limit = catalogSnapshotsPerRun): SearchCriteria[] {
  const catalog = products.flatMap((product) => product.searchAttribute.validVariantIds.map((variantId): SearchCriteria => ({
    productSlug: product.slug,
    variantId,
    condition: "any",
    market: "us",
  })));
  if (!catalog.length) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), catalog.length));
  const rotation = Math.floor(now / catalogRotationIntervalMs);
  const start = (rotation * safeLimit) % catalog.length;
  return Array.from({ length: safeLimit }, (_, index) => catalog[(start + index) % catalog.length]);
}

async function recordRefreshRun(environment: LiveOfferEnvironment, summary: Record<string, number>, completedAt: string) {
  if (!environment.DB) return;
  try {
    const create = environment.DB.prepare(`CREATE TABLE IF NOT EXISTS catalog_refresh_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      completed_at TEXT NOT NULL,
      queued INTEGER NOT NULL,
      catalog_queued INTEGER NOT NULL,
      stale_queued INTEGER NOT NULL,
      refreshed INTEGER NOT NULL,
      empty INTEGER NOT NULL,
      failed INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    )`);
    if (!("run" in create) || typeof create.run !== "function") return;
    await create.run();
    const insert = environment.DB.prepare(`INSERT INTO catalog_refresh_runs (
      completed_at, queued, catalog_queued, stale_queued, refreshed, empty, failed, duration_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(completedAt, summary.due, summary.catalogQueued, summary.staleQueued, summary.refreshed, summary.empty, summary.failed, summary.durationMs);
    if ("run" in insert && typeof insert.run === "function") await insert.run();
  } catch (error) {
    console.warn("[product-intelligence] catalog_refresh_audit_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function refreshPersistedProductIntelligenceSnapshots(
  environment: LiveOfferEnvironment,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
  search: SnapshotSearch,
  options: { catalogCriteria?: SearchCriteria[] } = {},
) {
  const startedAt = Date.now();
  if (!environment.DB) return { due: 0, catalogQueued: 0, staleQueued: 0, refreshed: 0, empty: 0, failed: 0, durationMs: 0 };
  const before = new Date(now - refreshIntervalMs).toISOString();
  const catalog = options.catalogCriteria ?? catalogRefreshCriteria(now);
  const staleLimit = Math.max(1, maxSnapshotsPerRun - catalog.length);
  const stale = await listProductIntelligenceSnapshotsDue(environment.DB, before, staleLimit);
  const due = [...new Map([...catalog, ...stale].map((criteria) => [productIntelligenceSnapshotKey(criteria), criteria])).values()].slice(0, maxSnapshotsPerRun);
  let refreshed = 0;
  let empty = 0;
  let failed = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < due.length) {
      const criteria = due[cursor];
      cursor += 1;
      try {
        const result = await search(criteria, environment, fetcher);
        if (result.offers.length) refreshed += 1;
        else empty += 1;
      } catch {
        failed += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) }, () => worker()));
  const catalogKeys = new Set(catalog.map(productIntelligenceSnapshotKey));
  const summary = {
    due: due.length,
    catalogQueued: due.filter((criteria) => catalogKeys.has(productIntelligenceSnapshotKey(criteria))).length,
    staleQueued: due.filter((criteria) => !catalogKeys.has(productIntelligenceSnapshotKey(criteria))).length,
    refreshed,
    empty,
    failed,
    durationMs: Date.now() - startedAt,
  };
  await recordRefreshRun(environment, summary, new Date().toISOString());
  return summary;
}
