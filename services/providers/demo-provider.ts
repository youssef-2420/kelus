import { offers } from "@/lib/demo-data";
import type { PriceObservation, ProviderResult, SearchCriteria } from "@/types/kelus";
import type { OfferProvider } from "@/services/providers/types";

abstract class DemoRetailerProvider implements OfferProvider {
  abstract id: string;
  protected abstract retailerId: string;
  async getOffers(criteria: SearchCriteria): Promise<ProviderResult> {
    const selected = offers.filter((offer) => offer.retailer.id === this.retailerId && offer.variantId === criteria.variantId && (criteria.condition === "any" || offer.condition === criteria.condition));
    const observations: PriceObservation[] = selected.flatMap((offer) => [899, 879, 849, 829, offer.price, offer.price].map((price, index) => ({ id: `${offer.id}-demo-price-${index}`, offerId: offer.id, price, timestamp: `2026-0${4 + index}-01T12:00:00Z`, isDemo: true })));
    return { providerId: this.id, offers: selected, observations, isDemo: true, matchedListingCount: selected.length, unmatchedListingCount: 0 };
  }
}

export class DemoAmazonProvider extends DemoRetailerProvider { id = "demo-amazon"; protected retailerId = "amazon"; }
export class DemoBestBuyProvider extends DemoRetailerProvider { id = "demo-best-buy"; protected retailerId = "best-buy"; }
export class DemoEbayProvider extends DemoRetailerProvider { id = "demo-ebay"; protected retailerId = "ebay"; }
export const demoProviders: OfferProvider[] = [new DemoAmazonProvider(), new DemoBestBuyProvider(), new DemoEbayProvider()];
