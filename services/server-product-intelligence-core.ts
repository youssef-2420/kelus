import { settleProductOfferLoad, type ProductOfferLoadOutcome } from "./product-offer-load.ts";
import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";

type LiveOfferLoader<Environment> = (criteria: SearchCriteria, environment: Environment) => Promise<OfferSearchResult>;
type PersistedOfferLoader = () => Promise<OfferSearchResult | null>;

const unavailableMessage = "Live offers are unavailable in this environment.";

function outcomeFor(result: OfferSearchResult): ProductOfferLoadOutcome {
  return { status: result.offers.length ? "SUCCESS" : "EMPTY", result };
}

async function readPersistedWithin(read: PersistedOfferLoader, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read().catch(() => null),
      new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function resolveInitialProductIntelligenceCacheFirst<Environment>(
  criteria: SearchCriteria,
  environment: Environment | undefined,
  readPersisted: PersistedOfferLoader,
  load: LiveOfferLoader<Environment>,
  options: { persistedTimeoutMs?: number; providerTimeoutMs?: number } = {},
): Promise<ProductOfferLoadOutcome> {
  if (!environment) return { status: "ERROR", message: unavailableMessage };
  const persisted = await readPersistedWithin(readPersisted, options.persistedTimeoutMs ?? 500);
  if (persisted) return outcomeFor(persisted);
  return settleProductOfferLoad(load(criteria, environment), options.providerTimeoutMs ?? 1_500);
}

export async function resolveInitialProductIntelligenceWithLoader<Environment>(
  criteria: SearchCriteria,
  environment: Environment | undefined,
  load: LiveOfferLoader<Environment>,
  timeoutMs = 18_000,
): Promise<ProductOfferLoadOutcome> {
  if (!environment) return { status: "ERROR", message: unavailableMessage };
  return settleProductOfferLoad(load(criteria, environment), timeoutMs);
}
