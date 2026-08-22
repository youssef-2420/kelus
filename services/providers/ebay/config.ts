export type EbayEnvironment = {
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_MARKETPLACE_ID?: string;
  EBAY_CACHE_TTL_SECONDS?: string;
  EBAY_REQUEST_TIMEOUT_MS?: string;
};

export type EbayProviderConfig = {
  clientId: string;
  clientSecret: string;
  marketplaceId: "EBAY_US";
  apiBaseUrl: string;
  cacheTtlMs: number;
  requestTimeoutMs: number;
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getEbayProviderConfig(env: EbayEnvironment): EbayProviderConfig {
  const clientId = env.EBAY_CLIENT_ID?.trim();
  const clientSecret = env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("eBay provider is not configured.");
  const marketplaceId = env.EBAY_MARKETPLACE_ID?.trim() || "EBAY_US";
  if (marketplaceId !== "EBAY_US") throw new Error("Kelus currently supports EBAY_US only.");
  return {
    clientId,
    clientSecret,
    marketplaceId,
    apiBaseUrl: "https://api.ebay.com",
    cacheTtlMs: positiveNumber(env.EBAY_CACHE_TTL_SECONDS, 60) * 1000,
    requestTimeoutMs: positiveNumber(env.EBAY_REQUEST_TIMEOUT_MS, 8000),
  };
}

