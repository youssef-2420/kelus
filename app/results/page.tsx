"use client";

import { useMemo, useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { OfferCard } from "@/components/OfferCard";
import { PriceChart } from "@/components/PriceChart";
import { WatchButton } from "@/components/WatchButton";
import { Icon } from "@/components/Icon";
import { featuredProduct, offers, priceHistory } from "@/lib/demo-data";
import Link from "next/link";

export default function ResultsPage() {
  const [sort, setSort] = useState("Recommended");
  const [filterOpen, setFilterOpen] = useState(false);
  const sorted = useMemo(() => [...offers].sort((a, b) => sort === "Lowest price" ? a.price - b.price : b.score - a.score), [sort]);
  return <main className="app-page"><KelusHeader /><div className="results-search"><SearchControls compact defaultProduct="iPhone 17"/></div>
    <section className="results-layout section"><div className="results-main"><div className="results-heading"><div><Link className="crumb" href="/">Search</Link><h1>iPhone 17 offers</h1><p>3 verified offers · New and like-new · United States</p></div><WatchButton /></div>
      <div className="controls-row"><button type="button" className="filter-toggle" onClick={() => setFilterOpen(!filterOpen)}><Icon name="sliders" size={16}/>Filters</button><div className="sort-tabs">{["Recommended", "Lowest price", "Best protection"].map((item) => <button key={item} className={sort === item ? "active" : ""} onClick={() => setSort(item)}>{item}</button>)}</div></div>
      {filterOpen && <aside className="filter-panel"><div><b>Condition</b><label><input type="checkbox" defaultChecked/> New</label><label><input type="checkbox" defaultChecked/> Used — like new</label></div><div><b>Retailer</b><label><input type="checkbox" defaultChecked/> Trusted retailers only</label></div><button className="button button-secondary" onClick={() => setFilterOpen(false)}>Apply filters</button></aside>}
      <p className="comparison-note"><Icon name="shield" size={17}/>We rank offers by total value, not just the lowest headline price.</p><div className="offer-list">{sorted.map((offer) => <OfferCard offer={offer} key={offer.id}/>)}</div>
    </div><aside className="insights-panel"><div className="product-summary"><span className="product-mark"><span>IPH</span></span><div><p className="eyebrow">Product overview</p><h2>{featuredProduct.name}</h2><p>256GB · New & used</p></div></div><div className="insight-card"><span className="insight-label">Best price today</span><strong>$749</strong><p>That is $50 below the six-month average.</p><Link href="/compare/iphone-17" className="text-link">Compare all trade-offs <Icon name="arrow" size={15}/></Link></div><div className="insight-card"><div className="insight-title"><span>Price history</span><b>Good time to buy</b></div><PriceChart points={priceHistory}/><p>Prices are at their lowest point in six months.</p></div></aside></section>
  </main>;
}
