import type { ProductOfferLoadOutcome } from "../services/product-offer-load.ts";
import type { Product } from "../types/kelus.ts";

export function hasComparableOffers(outcome: ProductOfferLoadOutcome) {
  return outcome.status === "SUCCESS"
    && outcome.result.offers.some((offer) => offer.dataSource === "live");
}

export function productSeoName(product: Pick<Product, "brand" | "name">) {
  return product.name.toLowerCase().includes(product.brand.toLowerCase())
    ? product.name
    : `${product.brand} ${product.name}`;
}
