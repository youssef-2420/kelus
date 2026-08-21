"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { OfferCard } from "@/components/OfferCard";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceChart } from "@/components/PriceChart";
import { WatchButton } from "@/components/WatchButton";
import { Icon } from "@/components/Icon";
import { demoRecommendations, featuredProduct, offers, priceHistory } from "@/lib/demo-data";

export default function ResultsPage() {
  const [sort, setSort] = useState("Recommended");
  const [filterOpen, setFilterOpen] = useState(false);
  const pick = offers.find((offer) => offer.id === demoRecommendations[0].offerId)!;
  const cheapest = offers.find((offer) => offer.id === demoRecommendations[1].offerId)!;
  const visibleOffers = useMemo(() => sort === "Cheapest" ? [...offers].sort((a, b) => a.price - b.price) : sort === "Safest option" ? [...offers].sort((a, b) => Number(b.condition === "New") - Number(a.condition === "New")) : [pick, ...offers.filter((offer) => offer.id !== pick.id)], [pick, sort]);
  return <main className="app-page"><KelusHeader /><div className="results-search"><SearchControls compact defaultProduct="iPhone 17"/></div>
    <section className="results-layout section"><div className="results-main"><div className="results-heading"><div><Link className="crumb" href="/">Search</Link><p className="eyebrow">Illustrative demo offers</p><h1>iPhone 17 offers</h1><p>256GB · New and like-new · United States</p></div><WatchButton /></div>
      <article className="recommendation-card"><div><span className="offer-badge">Kelus Pick</span><h2>{pick.retailer.name} <strong>${pick.price}</strong></h2><p>Why we’d choose it</p><ul>{demoRecommendations[0].reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p className="tradeoff"><b>Trade-off:</b> {demoRecommendations[0].tradeoffs[0]}</p></div><OutboundRetailerCTA offer={pick}/></article>
      <article className="alternative-card"><div><span className="insight-label">Cheapest alternative</span><h2>{cheapest.retailer.name} <strong>${cheapest.price}</strong></h2><p>Save $50 · {cheapest.condition}</p></div><p><b>Trade-off:</b> {demoRecommendations[1].tradeoffs[0]}</p></article>
      <div className="controls-row"><button type="button" className="filter-toggle" onClick={() => setFilterOpen(!filterOpen)}><Icon name="sliders" size={16}/>Filters</button><div className="sort-tabs">{["Recommended", "Cheapest", "Safest option"].map((item) => <button key={item} className={sort === item ? "active" : ""} onClick={() => setSort(item)}>{item}</button>)}</div></div>
      {filterOpen && <aside className="filter-panel"><div><b>Condition</b><label><input type="checkbox" defaultChecked/> New</label><label><input type="checkbox" defaultChecked/> Used — like new</label></div><div><b>Retailer</b><label><input type="checkbox" defaultChecked/> Established retailers</label></div><button className="button button-secondary" onClick={() => setFilterOpen(false)}>Apply filters</button></aside>}
      <p className="comparison-note"><Icon name="shield" size={17}/>Kelus compares retailer terms and evidence. Retailers handle the purchase.</p><div className="offer-list">{visibleOffers.map((offer) => <OfferCard offer={offer} key={offer.id}/>)}</div>
    </div><aside className="insights-panel"><div className="product-summary"><span className="product-mark"><span>IPH</span></span><div><p className="eyebrow">Product overview</p><h2>{featuredProduct.name}</h2><p>256GB · Demo data</p></div></div><div className="insight-card"><span className="insight-label">Price context · demo</span><strong>$799</strong><p>Current trusted price · typical recent price $849 · recent low $779.</p><Link href="/compare/iphone-17" className="text-link">Compare the evidence <Icon name="arrow" size={15}/></Link></div><div className="insight-card"><div className="insight-title"><span>Price history · illustrative</span><b>Good time to buy</b></div><PriceChart points={priceHistory}/><p>Illustrative values only until live provider data is connected.</p></div></aside></section>
  </main>;
}
