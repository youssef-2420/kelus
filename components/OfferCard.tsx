import { canonicalProductPath, defaultSearch } from "@/lib/search-state";
import type { Offer } from "@/types/kelus";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";

export function OfferCard({ offer }: { offer: Offer }) {
  const condition = offer.condition[0].toUpperCase() + offer.condition.slice(1);
  return <article className="offer-card">
    <div className="offer-top"><div><h3>{offer.retailer.name}</h3><p>{offer.seller.name ?? "Seller unavailable"} · {offer.availability}</p></div><div className="offer-price"><strong>${offer.price}</strong><span>{offer.delivery ?? "Shipping unavailable"}</span></div></div>
    <div className="offer-details"><span><Icon name="tag" size={16}/>{condition}</span><span><Icon name="shield" size={16}/>{offer.warranty ?? "Warranty unavailable"}</span><span><Icon name="history" size={16}/>{offer.returnPolicy ?? "Return terms unavailable"}</span></div>
    <div className="offer-footer"><Link className="text-link" href={canonicalProductPath(defaultSearch)}>View product comparison <Icon name="arrow" size={15}/></Link><OutboundRetailerCTA offer={offer} compact/></div>
  </article>;
}
