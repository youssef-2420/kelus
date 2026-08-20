import type { Offer } from "@/types/kelus";
import { Icon } from "@/components/Icon";

export function OfferCard({ offer }: { offer: Offer }) {
  return <article className="offer-card">
    <div className="offer-top"><div>{offer.badge && <span className="offer-badge">{offer.badge}</span>}<h3>{offer.retailer}</h3><p>{offer.sellerNote}</p></div><div className="offer-price"><strong>${offer.price}</strong><span>{offer.delivery}</span></div></div>
    <div className="offer-details"><span><Icon name="tag" size={16}/>{offer.condition}</span><span><Icon name="shield" size={16}/>{offer.protection}</span><span><Icon name="history" size={16}/>{offer.returnWindow}</span></div>
    <div className="offer-footer"><span className="score"><b>{offer.score}</b>/100 Kelus score</span><a className="text-link" href="/compare/iphone-17">Review offer <Icon name="arrow" size={15}/></a></div>
  </article>;
}
