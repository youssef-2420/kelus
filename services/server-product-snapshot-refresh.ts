import type { SearchCriteria, OfferSearchResult } from "../types/kelus.ts";
import type { LiveOfferEnvironment } from "./server-offer-service.ts";
import { listProductIntelligenceSnapshotsDue } from "./product-intelligence-snapshot-store.ts";

const refreshIntervalMs = 5 * 60 * 1_000;
const maxSnapshotsPerRun = 20;
const concurrency = 3;

type SnapshotSearch = (
  criteria: SearchCriteria,
  environment: LiveOfferEnvironment,
  fetcher?: typeof fetch,
) => Promise<OfferSearchResult>;

export async function refreshPersistedProductIntelligenceSnapshots(
  environment: LiveOfferEnvironment,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
  search: SnapshotSearch,
) {
  if (!environment.DB) return { due: 0, refreshed: 0, empty: 0, failed: 0 };
  const before = new Date(now - refreshIntervalMs).toISOString();
  const due = await listProductIntelligenceSnapshotsDue(environment.DB, before, maxSnapshotsPerRun);
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
  return { due: due.length, refreshed, empty, failed };
}
