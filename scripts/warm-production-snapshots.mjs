#!/usr/bin/env node
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey, priorityCatalogSnapshotTargets } from "../lib/catalog-snapshot-targets.ts";
import { searchCriteriaToQuery } from "../lib/search-state.ts";

const baseUrl = (process.env.KELUS_BASE_URL ?? "https://kelus.me").replace(/\/$/, "");
const concurrency = Number(process.env.SNAPSHOT_WARM_CONCURRENCY ?? 3);
const delayMs = Number(process.env.SNAPSHOT_WARM_DELAY_MS ?? 400);
const limit = process.env.SNAPSHOT_WARM_LIMIT ? Number(process.env.SNAPSHOT_WARM_LIMIT) : undefined;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmOne(criteria) {
  const url = `${baseUrl}/api/offers?${searchCriteriaToQuery(criteria)}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const body = await response.json().catch(() => null);
  return {
    key: catalogSnapshotTargetKey(criteria),
    status: response.status,
    offers: Array.isArray(body?.offers) ? body.offers.length : 0,
    error: body?.error?.code,
    refreshFailed: body?.lastRefreshFailed === true,
    refreshReturnedEmpty: body?.lastRefreshReturnedEmpty === true,
  };
}

const priority = priorityCatalogSnapshotTargets();
const priorityKeys = new Set(priority.map(catalogSnapshotTargetKey));
const orderedTargets = [...priority, ...allCatalogSnapshotTargets().filter((target) => !priorityKeys.has(catalogSnapshotTargetKey(target)))];
const targets = limit && Number.isFinite(limit) ? orderedTargets.slice(0, limit) : orderedTargets;
let warmed = 0;
let empty = 0;
let failed = 0;
let rateLimited = 0;
let staleFallback = 0;
let cursor = 0;

const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
  while (cursor < targets.length) {
    const index = cursor;
    cursor += 1;
    const criteria = targets[index];
    try {
      const result = await warmOne(criteria);
      if (result.status >= 200 && result.status < 300 && result.offers > 0 && !result.refreshFailed && !result.refreshReturnedEmpty) {
        warmed += 1;
        console.info(`[production-warm] ${result.key} (${result.offers} offers)`);
      } else if (result.refreshFailed || result.refreshReturnedEmpty) {
        staleFallback += 1;
        console.warn(`[production-warm] stale fallback ${result.key} refresh=${result.refreshFailed ? "failed" : "empty"}`);
      } else if (result.status === 429 || result.error === "rate_limited") {
        rateLimited += 1;
        console.warn(`[production-warm] rate limited ${result.key}; existing snapshots remain available`);
      } else if (result.status >= 200 && result.status < 300) {
        empty += 1;
        console.warn(`[production-warm] empty ${result.key}`);
      } else {
        failed += 1;
        console.warn(`[production-warm] failed ${result.key} status=${result.status} code=${result.error ?? "unknown"}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`[production-warm] error ${catalogSnapshotTargetKey(criteria)}`, error instanceof Error ? error.message : error);
    }
    if (index < targets.length - 1) await sleep(delayMs);
  }
});

await Promise.all(workers);
console.info("[production-warm] complete", { baseUrl, targets: targets.length, warmed, empty, failed, rateLimited, staleFallback });
if (failed > 0 && warmed === 0) {
  console.error("[production-warm] no snapshots warmed because of a hard failure");
  process.exitCode = 1;
} else if (warmed === 0 && (rateLimited > 0 || staleFallback > 0)) {
  console.warn("[production-warm] provider unavailable after deploy; keeping last-known-good snapshots");
}
