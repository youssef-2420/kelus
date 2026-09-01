#!/usr/bin/env node
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey } from "../lib/catalog-snapshot-targets.ts";
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
  };
}

const targets = limit && Number.isFinite(limit) ? allCatalogSnapshotTargets().slice(0, limit) : allCatalogSnapshotTargets();
let warmed = 0;
let empty = 0;
let failed = 0;
let cursor = 0;

const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
  while (cursor < targets.length) {
    const index = cursor;
    cursor += 1;
    const criteria = targets[index];
    try {
      const result = await warmOne(criteria);
      if (result.status >= 200 && result.status < 300 && result.offers > 0) {
        warmed += 1;
        console.info(`[production-warm] ${result.key} (${result.offers} offers)`);
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
console.info("[production-warm] complete", { baseUrl, targets: targets.length, warmed, empty, failed });
if (failed > 0) process.exitCode = 1;
