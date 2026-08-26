import type { OfferSearchResult } from "../types/kelus.ts";

export type ProductOfferLoadOutcome =
  | { status: "SUCCESS"; result: OfferSearchResult }
  | { status: "EMPTY"; result: OfferSearchResult }
  | { status: "ERROR"; message: string };

const fallbackError = "We couldn't load live offers.";

export function settleProductOfferLoad(request: Promise<OfferSearchResult>, timeoutMs = 21_000): Promise<ProductOfferLoadOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: ProductOfferLoadOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(outcome);
    };
    const timeout = setTimeout(() => finish({ status: "ERROR", message: "The live search took too long. Please try again." }), timeoutMs);
    request.then((result) => finish({ status: result.offers.length ? "SUCCESS" : "EMPTY", result }))
      .catch((error) => finish({ status: "ERROR", message: error instanceof Error && error.message ? error.message : fallbackError }));
  });
}
