export function userFacingOfferError(code?: string, status?: number, fallback?: string) {
  if (code === "provider_unconfigured") return "Live price checks are temporarily unavailable. Saved comparisons still appear when Kelus has them.";
  if (code === "rate_limited") return "eBay is busy right now. Please try again in a minute.";
  if (code === "timeout") return "The live search took too long. Please try again.";
  if (code === "network" || code === "malformed_response") return "We couldn't reach the live offer service. Please try again.";
  if (status === 503 || status === 429) return "Live price checks are temporarily unavailable. Try again shortly.";
  return fallback ?? "We couldn't load live offers right now.";
}
