import { Icon } from "@/components/Icon";
import type { Offer } from "@/types/kelus";
import { trackEvent } from "@/services/analytics";

export function OutboundRetailerCTA({ offer, compact = false, label = "View deal", ourPick = false }: { offer: Offer; compact?: boolean; label?: string; ourPick?: boolean }) {
  if (!offer.affiliateUrl) return <p className="outbound-cta-unavailable">Listing link unavailable</p>;
  return <a className={compact ? "text-link outbound-cta" : "button button-primary outbound-cta"} href={offer.affiliateUrl} target="_blank" rel="noopener noreferrer" onClick={() => { trackEvent({ name: "offer_viewed", offerId: offer.id }); if (offer.sourceProvider === "ebay") trackEvent({ name: "ebay_offer_viewed", offerId: offer.id }); if (ourPick) trackEvent({ name: "our_pick_clicked", offerId: offer.id }); trackEvent({ name: "retailer_clicked", offerId: offer.id }); }}>{label}<Icon name="arrow" size={compact ? 15 : 17}/></a>;
}
