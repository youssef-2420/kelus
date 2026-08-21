import { Icon } from "@/components/Icon";
import type { Offer } from "@/types/kelus";

export function OutboundRetailerCTA({ offer, compact = false }: { offer: Offer; compact?: boolean }) {
  const label = `View deal at ${offer.retailer.name}`;
  if (!offer.affiliateUrl) return <button className={compact ? "text-link outbound-cta" : "button button-primary outbound-cta"} type="button" disabled title="Retailer link will be connected when live provider data is available">{label}<Icon name="arrow" size={compact ? 15 : 17}/><span className="sr-only"> (demo retailer link not connected)</span></button>;
  return <a className={compact ? "text-link outbound-cta" : "button button-primary outbound-cta"} href={offer.affiliateUrl} target="_blank" rel="noreferrer">{label}<Icon name="arrow" size={compact ? 15 : 17}/></a>;
}
