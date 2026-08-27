import { Icon } from "@/components/Icon";
import type { Offer } from "@/types/kelus";
import { trackEvent } from "@/services/analytics";

export function OutboundRetailerCTA({ offer, compact = false, label = "View deal" }: { offer: Offer; compact?: boolean; label?: string }) {
  if (!offer.affiliateUrl) return <button className={compact ? "text-link outbound-cta" : "button button-primary outbound-cta"} type="button" disabled title="Retailer link will be connected when live provider data is available">{label}<Icon name="arrow" size={compact ? 15 : 17}/><span className="sr-only"> (demo retailer link not connected)</span></button>;
  return <a className={compact ? "text-link outbound-cta" : "button button-primary outbound-cta"} href={offer.affiliateUrl} target="_blank" rel="noopener noreferrer" onClick={() => { trackEvent({ name: "offer_viewed", offerId: offer.id }); if (offer.sourceProvider === "ebay") trackEvent({ name: "ebay_offer_viewed", offerId: offer.id }); trackEvent({ name: "retailer_clicked", offerId: offer.id }); }}>{label}<Icon name="arrow" size={compact ? 15 : 17}/></a>;
}
