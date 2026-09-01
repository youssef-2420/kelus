#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey } from "../lib/catalog-snapshot-targets.ts";
import { getProductBySlug } from "../lib/demo-data.ts";
import { searchCriteriaToQuery } from "../lib/search-state.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(root, "data", "bundled-product-intelligence-snapshots.json");
const baseUrl = (process.env.KELUS_BASE_URL ?? "https://kelus.me").replace(/\/$/, "");
const concurrency = Number(process.env.SNAPSHOT_WARM_CONCURRENCY ?? 2);
const delayMs = Number(process.env.SNAPSHOT_WARM_DELAY_MS ?? 600);
const productFilter = process.env.HARVEST_PRODUCT_SLUGS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
const onlyMissing = process.env.HARVEST_ONLY_MISSING !== "0";

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

function snapshotFromResponse(body) {
  if (!body || !Array.isArray(body.offers) || !body.offers.length) return null;
  const liveOffers = body.offers.filter((offer) => offer.dataSource === "live");
  if (!liveOffers.length) return null;
  return {
    offers: body.offers,
    observations: Array.isArray(body.observations) ? body.observations : [],
    observationsStored: Boolean(body.observationsStored),
    failedProviders: Array.isArray(body.failedProviders) ? body.failedProviders : [],
    connectedProviders: Array.isArray(body.connectedProviders) ? body.connectedProviders : ["ebay"],
    isDemo: false,
    lastUpdated: body.lastUpdated ?? new Date().toISOString(),
  };
}

let targets = allCatalogSnapshotTargets();
if (productFilter.length) {
  targets = targets.filter((criteria) => productFilter.includes(criteria.productSlug));
}

const existing = await loadExisting();
if (onlyMissing) {
  targets = targets.filter((criteria) => {
    const key = catalogSnapshotTargetKey(criteria);
    const snapshot = existing[key];
    return !snapshot?.offers?.some((offer) => offer.dataSource === "live");
  });
}

if (!targets.length) {
  console.info("[harvest-production] nothing to harvest");
  process.exit(0);
}

const snapshots = { ...existing };
let harvested = 0;
let empty = 0;
let failed = 0;
let cursor = 0;

const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
  while (cursor < targets.length) {
    const index = cursor;
    cursor += 1;
    const criteria = targets[index];
    const key = catalogSnapshotTargetKey(criteria);
    const product = getProductBySlug(criteria.productSlug);
    const url = `${baseUrl}/api/offers?${searchCriteriaToQuery(criteria)}`;
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        failed += 1;
        console.warn(`[harvest-production] failed ${key} status=${response.status} code=${body?.error?.code ?? "unknown"}`);
        continue;
      }
      const snapshot = snapshotFromResponse(body);
      if (snapshot) {
        snapshots[key] = snapshot;
        harvested += 1;
        console.info(`[harvest-production] saved ${key} (${product?.name ?? criteria.productSlug}, ${snapshot.offers.length} offers)`);
      } else {
        empty += 1;
        console.warn(`[harvest-production] empty ${key}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`[harvest-production] error ${key}`, error instanceof Error ? error.message : error);
    }
    if (index < targets.length - 1) await sleep(delayMs);
  }
});

await Promise.all(workers);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshots, null, 2)}\n`);
console.info("[harvest-production] complete", {
  baseUrl,
  targets: targets.length,
  harvested,
  empty,
  failed,
  savedKeys: Object.keys(snapshots).length,
});
