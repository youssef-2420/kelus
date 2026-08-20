"use client";

import { useState } from "react";

const offerData = [
  ["Kelus Pick", "Amazon", "$799", "$50 below typical price", "New · Unlocked", "Verified seller", "1-year warranty"],
  ["Safest", "Best Buy", "$829", "Near 30-day low", "New · Unlocked", "Verified seller", "30-day returns"],
  ["Cheapest", "eBay", "$749", "$100 below typical price", "Used · Excellent", "Seller protection varies", "Limited returns"],
];
const products = ["iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone 16 Pro"];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function PhoneThumb({ compact = false }: { compact?: boolean }) {
  return <span className={compact ? "phone-thumb phone-thumb--compact" : "phone-thumb"} aria-hidden="true"><span /></span>;
}

export default function Home() {
  const [product, setProduct] = useState("iPhone 17");
  const [condition, setCondition] = useState("New & Used");
  const [variant, setVariant] = useState("256GB");
  const [sort, setSort] = useState("Best");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alert, setAlert] = useState(false);
  const shownOffers = sort === "Cheapest" ? [...offerData].reverse() : offerData;

  return <main>
    <header className="site-header container">
      <a className="wordmark" href="#top">kelus</a>
      <nav className="desktop-nav"><a href="#results">Compare</a><a href="#budget">Find for my budget</a><a href="#alerts">My Alerts</a></nav>
      <button className="button button--small button--outline">Sign in</button>
    </header>

    <section className="hero container" id="top">
      <div className="eyebrow"><span className="eyebrow-dot" /> Comparison, with context</div>
      <h1>Shop smarter.<br /><em>Know before you buy.</em></h1>
      <p className="hero-copy">Kelus compares price, protection, and history so you can choose the offer that is actually worth buying.</p>
      <div className="search-shell" role="search">
        <div className="search-field search-field--product">
          <label htmlFor="product">Product</label>
          <div className="field-row"><Icon>⌕</Icon><input id="product" value={product} onChange={event => { setProduct(event.target.value); setSuggestionsOpen(true); }} onFocus={() => setSuggestionsOpen(true)} /><button className="field-clear" onClick={() => setProduct("")} aria-label="Clear product">×</button></div>
          {suggestionsOpen && <div className="suggestions"><div className="suggestions-label">Suggested products</div>{products.map(name => <button key={name} onClick={() => { setProduct(name); setSuggestionsOpen(false); }}><PhoneThumb compact /><span><strong>{name}</strong><small>Apple · Smartphone</small></span></button>)}<div className="suggestions-label suggestions-label--recent">Recent searches</div><button className="recent-search" onClick={() => setProduct("MacBook Air M4")}>MacBook Air M4 <span>◷</span></button></div>}
        </div>
        <div className="search-field"><label htmlFor="condition">Condition</label><select id="condition" value={condition} onChange={event => setCondition(event.target.value)}><option>New &amp; Used</option><option>New</option><option>Used</option><option>Refurbished</option></select></div>
        <div className="search-field"><label htmlFor="variant">Variant</label><select id="variant" value={variant} onChange={event => setVariant(event.target.value)}><option>256GB</option><option>128GB</option><option>512GB</option><option>1TB</option></select></div>
        <div className="search-field search-field--location"><label>Location</label><div className="field-row field-static"><Icon>⌖</Icon><span>United States</span><span className="select-chevron">⌄</span></div></div>
        <button className="button button--primary search-button" onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}>Compare prices <span>›</span></button>
      </div>
      <div className="trust-row"><span><Icon>♢</Icon>Trusted retailers</span><span><Icon>◇</Icon>Real-time prices</span><span><Icon>⟳</Icon>Price history insights</span><span><Icon>♙</Icon>Safe &amp; secure</span></div>
    </section>

    <section className="results-section container" id="results">
      <div className="section-heading"><div><div className="eyebrow">Results for</div><h2>{product || "your search"}</h2><p>24 offers · Typical market price <strong>$849</strong></p></div><div className="heading-actions"><button className="button button--outline" onClick={() => setAlert(true)}><Icon>⌁</Icon>{alert ? "Alert created" : "Track price"}</button><button className="button button--filter" onClick={() => setFiltersOpen(true)}><Icon>☷</Icon>Filters <span>3</span></button></div></div>
      <div className="insight-grid"><div className="insight insight--verdict"><div className="insight-icon">✓</div><div><span>Kelus verdict</span><strong>Good time to buy</strong><p>Trusted offers are below the recent average.</p></div></div><div className="insight"><span>Best trusted price</span><strong>$799</strong><small>↓ 6.4% vs 30-day average</small></div><div className="insight"><span>30-day low</span><strong>$729</strong><small>Current price is $70 above low</small></div><div className="insight insight--chart"><span>Price movement</span><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/></div><small>Falling over the last 14 days</small></div></div>
      <div className="results-layout">
        <aside className={filtersOpen ? "filter-panel filter-panel--open" : "filter-panel"}><div className="filter-panel-header"><h3>Filters <span>3 active</span></h3><button onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></div><label>Storage<select value={variant} onChange={event => setVariant(event.target.value)}><option>256GB</option><option>128GB</option><option>512GB</option></select></label><fieldset><legend>Condition</legend><label className="check-row"><input type="checkbox" defaultChecked /> New</label><label className="check-row"><input type="checkbox" /> Used</label><label className="check-row"><input type="checkbox" /> Refurbished</label></fieldset><label>Price range<div className="range-value">$729 — $1,099</div><input type="range" min="729" max="1099" defaultValue="899" /></label><fieldset><legend>Buyer protection</legend><label className="check-row"><input type="checkbox" defaultChecked /> Verified sellers</label><label className="check-row"><input type="checkbox" defaultChecked /> Warranty included</label><label className="check-row"><input type="checkbox" defaultChecked /> 30-day returns</label><label className="check-row"><input type="checkbox" /> Free shipping</label></fieldset><button className="button button--primary filter-apply" onClick={() => setFiltersOpen(false)}>Apply filters</button></aside>
        <div className="offers-column"><div className="offers-toolbar"><span><strong>Showing 3 of 24</strong> qualifying offers</span><div className="sort-tabs">{["Best", "Cheapest", "Safest"].map(item => <button key={item} className={sort === item ? "is-active" : ""} onClick={() => setSort(item)}>{item}</button>)}</div></div>{shownOffers.map((offer, index) => <article className="offer-card" key={offer[1]}><div className="offer-main"><PhoneThumb /><div className="offer-product"><div className="offer-labels"><span className={index === 0 ? "label label--green" : index === 1 ? "label label--blue" : "label label--sand"}>{offer[0]}</span><button className={saved && index === 0 ? "save-button is-saved" : "save-button"} onClick={() => setSaved(!saved)} aria-label="Save offer">{saved && index === 0 ? "♥" : "♡"}</button></div><h3>iPhone 17</h3><p>{variant} · {offer[4]}</p><div className="seller"><span className="seller-mark">{offer[1][0]}</span><strong>{offer[1]}</strong><span className="rating">★ {index === 2 ? "4.5" : index === 1 ? "4.7" : "4.8"}</span></div></div><div className="offer-evidence"><span><Icon>✓</Icon>{offer[5]}</span><span><Icon>▱</Icon>{index === 2 ? "$8 shipping" : "Free shipping"}</span><span><Icon>□</Icon>{offer[6]}</span><span><Icon>◌</Icon>{index === 2 ? "No warranty" : "1-year warranty"}</span></div><div className="offer-price"><strong>{offer[2]}</strong><span>{offer[3]}</span><button className="button button--primary">View deal <span>↗</span></button></div></div></article>)}</div>
      </div>
    </section>

    <section className="bottom-section container" id="budget"><div className="budget-card"><div className="eyebrow">Find for my budget</div><h2>Make the trade-off clear.</h2><p>Tell Kelus what matters most and we’ll surface the strongest fit—not just the lowest number.</p><div className="budget-inputs"><span>Smartphone</span><span>$800 budget</span><span>Best value</span><button className="button button--primary">Find my fit <span>›</span></button></div></div><div className="history-card" id="alerts"><div className="history-heading"><div><div className="eyebrow">Price history</div><h2>Worth buying today?</h2></div><span className="trend">↓ 6.4%</span></div><div className="history-chart"><div className="chart-line" /><span className="chart-point chart-point--current" /><span className="chart-point chart-point--low" /><div className="chart-axis"><span>30 days ago</span><span>Today</span></div></div><p>Current trusted offers are below the recent average.</p></div></section>
    <footer className="site-footer container"><span className="wordmark wordmark--footer">kelus</span><span>Compare with context. Buy with confidence.</span></footer>
  </main>;
}
