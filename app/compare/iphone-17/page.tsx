import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { offers } from "@/lib/demo-data";

const rows = [
  ["Price", "$799", "$799", "$749"], ["Condition", "New", "New", "Used — like new"], ["Delivery", "Tomorrow", "Pickup today", "In 2 days"], ["Warranty", "1 year", "1 year", "1 year"], ["Returns", "30 days", "15 days", "30 days"], ["Kelus score", "94 / 100", "92 / 100", "87 / 100"],
];

export default function ComparePage() {
  return <main className="app-page"><KelusHeader /><section className="compare-page section"><a className="crumb" href="/product/iphone-17">← iPhone 17 details</a><div className="compare-head"><div><p className="eyebrow">Offer comparison</p><h1>See the trade-offs clearly.</h1><p>Every option is compared on the details that change the real value of your purchase.</p></div><a className="button button-secondary" href="/results">Edit search</a></div><div className="compare-table" role="table"><div className="compare-row compare-columns" role="row"><span role="columnheader">Offer</span>{offers.map((offer) => <div role="columnheader" key={offer.id}><small>{offer.badge}</small><b>{offer.retailer}</b><strong>${offer.price}</strong></div>)}</div>{rows.map((row) => <div className="compare-row" role="row" key={row[0]}><span role="rowheader">{row[0]}</span>{row.slice(1).map((value, index) => <div key={value + index}>{index === 0 && (row[0] === "Kelus score" || row[0] === "Price") ? <b className="recommended-value"><Icon name="check" size={15}/>{value}</b> : value}</div>)}</div>)}</div><div className="compare-callout"><Icon name="shield"/><div><b>Why Kelus recommends Amazon</b><p>It matches the best new price while offering a longer return window than the other new option.</p></div><a className="button button-primary" href="/saved">Track this product</a></div></section></main>;
}
