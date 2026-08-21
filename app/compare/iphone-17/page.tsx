import Link from "next/link";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { offers } from "@/lib/demo-data";
import { getRecommendation } from "@/services/recommendations";

export default function ComparePage() {
  const rows = [
    ["Price", ...offers.map((offer) => `$${offer.price}`)], ["Condition", ...offers.map((offer) => offer.condition)], ["Delivery", ...offers.map((offer) => offer.delivery)], ["Warranty", ...offers.map((offer) => offer.warranty)], ["Retailer return terms", ...offers.map((offer) => offer.returnPolicy)], ["Availability", ...offers.map((offer) => offer.availability)],
  ];
  const recommendation = getRecommendation(offers, "kelus_pick")!;
  const pick = offers.find((offer) => offer.id === recommendation.offerId)!;
  return <main className="app-page"><KelusHeader /><section className="compare-page section"><Link className="crumb" href="/product/iphone-17">← iPhone 17 details</Link><div className="compare-head"><div><p className="eyebrow">Illustrative comparison</p><h1>See the trade-offs clearly.</h1><p>Compare the retailer terms that change the value of a deal. Kelus does not sell or fulfill products.</p></div><Link className="button button-secondary" href="/results">Edit search</Link></div><div className="compare-table" role="table"><div className="compare-row compare-columns" role="row"><span role="columnheader">Offer</span>{offers.map((offer) => <div role="columnheader" key={offer.id}><small>{offer.id === pick.id ? "Kelus Pick" : offer.id.includes("ebay") ? "Cheapest" : "Safest option"}</small><b>{offer.retailer.name}</b><strong>${offer.price}</strong></div>)}</div>{rows.map((row) => <div className="compare-row" role="row" key={row[0]}><span role="rowheader">{row[0]}</span>{row.slice(1).map((value, index) => <div key={value + index}>{index === 0 && row[0] === "Price" ? <b className="recommended-value"><Icon name="check" size={15}/>{value}</b> : value}</div>)}</div>)}</div><div className="compare-callout"><Icon name="tag"/><div><b>Why Kelus recommends {pick.retailer.name}</b><p>{recommendation.reasons.join(" · ")}</p></div><OutboundRetailerCTA offer={pick}/></div></section></main>;
}
