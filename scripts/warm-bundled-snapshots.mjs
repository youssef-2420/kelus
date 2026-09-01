#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey } from "../lib/catalog-snapshot-targets.ts";
import { getLiveOffersForSearch } from "../services/server-offer-service.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(root, "data", "bundled-product-intelligence-snapshots.json");
const concurrency = Number(process.env.SNAPSHOT_WARM_CONCURRENCY ?? 2);
const delayMs = Number(process.env.SNAPSHOT_WARM_DELAY_MS ?? 750);
const limit = process.env.SNAPSHOT_WARM_LIMIT ? Number(process.env.SNAPSHOT_WARM_LIMIT) : undefined;

const env = {
  EBAY_CLIENT_ID: process.env.EBAY_CLIENT_ID,
  EBAY_CLIENT_SECRET: process.env.EBAY_CLIENT_SECRET,
  EBAY_MARKETPLACE_ID: process.env.EBAY_MARKETPLACE_ID,
  EBAY_CACHE_TTL_SECONDS: process.env.EBAY_CACHE_TTL_SECONDS,
  EBAY_REQUEST_TIMEOUT_MS: process.env.EBAY_REQUEST_TIMEOUT_MS,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return {};
  }
}

async function warmOne(criteria) {
  const result = await getLiveOffersForSearch(criteria, env, fetch, { allowStaleFallback: false });
  if (!result.offers.length) return null;
  return {
    offers: result.offers,
    observations: [],
    observationsStored: false,
    failedProviders: result.failedProviders,
    connectedProviders: result.connectedProviders ?? ["ebay"],
    isDemo: false,
    lastUpdated: result.lastUpdated ?? new Date().toISOString(),
  };
}

const targets = (limit && Number.isFinite(limit) ? allCatalogSnapshotTargets().slice(0, limit) : allCatalogSnapshotTargets());
if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
  console.error("Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET before warming bundled snapshots.");
  process.exit(1);
}

const snapshots = await loadExisting();
let warmed = 0;
let empty = 0;
let failed = 0;
let cursor = 0;

const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
  while (cursor < targets.length) {
    const index = cursor;
    cursor += 1;
    const criteria = targets[index];
    const key = catalogSnapshotTargetKey(criteria);
    try {
      const snapshot = await warmOne(criteria);
      if (snapshot) {
        snapshots[key] = snapshot;
        warmed += 1;
        console.info(`[bundled-warm] saved ${key} (${snapshot.offers.length} offers)`);
      } else {
        empty += 1;
        console.warn(`[bundled-warm] empty ${key}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`[bundled-warm] failed ${key}`, error instanceof Error ? error.message : error);
    }
    if (index < targets.length - 1) await sleep(delayMs);
  }
});

await Promise.all(workers);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshots, null, 2)}\n`);
console.info("[bundled-warm] complete", { targets: targets.length, warmed, empty, failed, savedKeys: Object.keys(snapshots).length });
