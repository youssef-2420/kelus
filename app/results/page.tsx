"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { OfferCard } from "@/components/OfferCard";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceChart } from "@/components/PriceChart";
import { WatchButton } from "@/components/WatchButton";
import { Icon } from "@/components/Icon";
import { getProductBySlug, getVariantById, priceHistory } from "@/lib/demo-data";
import { readSearchCriteria } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import { getOffersForSearch } from "@/services/offer-service";
import { getPriceContext } from "@/services/price-context";
import { getRecommendation, sortOffers } from "@/services/recommendations";
import type { Offer, OfferSearchResult } from "@/types/kelus";

type SortMode = "recommended" | "lowest" | "safest";
const conditionLabel = (condition: string) => condition === "any" ? "Any condition" : condition[0].toUpperCase() + condition.slice(1);

export default function ResultsPage() {
  return <Suspense fallback={<main className="app-page"><KelusHeader/><section className="results-layout section"><div className="results-state"><Icon name="history" size={24}/><h2>Preparing your comparison…</h2></div></section></main>}><ResultsSearchPage/></Suspense>;
}

function ResultsSearchPage() {
  const searchParams = useSearchParams();
  const criteria = useMemo(() => readSearchCriteria(new URLSearchParams(searchParams.toString())), [searchParams]);
  return <ResultsContent key={searchParams.toString()} criteria={criteria} searchKey={searchParams.toString()}/>;
}

function ResultsContent({ criteria, searchKey }: { criteria: ReturnType<typeof readSearchCriteria>; searchKey: string }) {
  const product = getProductBySlug(criteria.productSlug)!;
  const variant = getVariantById(criteria.variantId);
  const [result, setResult] = useState<OfferSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<SortMode>("recommended");
  const [filterOpen, setFilterOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [retailer, setRetailer] = useState("all");
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [returnsOnly, setReturnsOnly] = useState(false);

  useEffect(() => { let cancelled = false; getOffersForSearch(criteria).then((next) => { if (!cancelled) setResult(next); }).catch(() => { if (!cancelled) setFailed(true); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [criteria]);
  const filteredOffers = useMemo(() => (result?.offers ?? []).filter((offer) => (!maxPrice || offer.price + offer.shippingCost <= Number(maxPrice)) && (retailer === "all" || offer.retailer.id === retailer) && (!warrantyOnly || Boolean(offer.warranty)) && (!returnsOnly || /\d+-day/.test(offer.returnPolicy))), [maxPrice, result?.offers, retailer, returnsOnly, warrantyOnly]);
  const sortedOffers = useMemo(() => sortOffers(filteredOffers, sort), [filteredOffers, sort]);
  const pickRecommendation = getRecommendation(filteredOffers, "kelus_pick");
  const cheapestRecommendation = getRecommendation(filteredOffers, "cheapest");
  const safestRecommendation = getRecommendation(filteredOffers, "safest_option");
  const pick = filteredOffers.find((offer) => offer.id === pickRecommendation?.offerId);
  const cheapest = filteredOffers.find((offer) => offer.id === cheapestRecommendation?.offerId);
  const safest = filteredOffers.find((offer) => offer.id === safestRecommendation?.offerId);
  const priceContext = getPriceContext(filteredOffers, result?.observations ?? []);
  const retailers = [...new Map((result?.offers ?? []).map((offer) => [offer.retailer.id, offer.retailer])).values()];

  function applyFilter() { setFilterOpen(false); trackEvent({ name: "filter_changed", filter: "offer_filters" }); }
  function recommendationCard(title: string, offer: Offer | undefined, recommendation: ReturnType<typeof getRecommendation>) {
    if (!offer || !recommendation) return null;
    return <article className={title === "Kelus Pick" ? "recommendation-card" : "alternative-card"}><div><span className={title === "Kelus Pick" ? "offer-badge" : "insight-label"}>{title}</span><h2>{offer.retailer.name} <strong>${offer.price + offer.shippingCost}</strong></h2>{title === "Kelus Pick" && <><p>Why we’d choose it</p><ul>{recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}<p className="tradeoff"><b>Trade-off:</b> {recommendation.tradeoffs[0]}</p></div>{title === "Kelus Pick" ? <OutboundRetailerCTA offer={offer}/> : null}</article>;
  }

  return <main className="app-page"><KelusHeader/><div className="results-search"><SearchControls key={searchKey} compact initialCriteria={criteria}/></div>
    <section className="results-layout section"><div className="results-main"><div className="results-heading"><div><Link className="crumb" href="/">Search</Link><p className="eyebrow">Illustrative demo offers</p><h1>{product.name} offers</h1><p>{variant?.label ?? "All variants"} · {conditionLabel(criteria.condition)} · United States</p></div><WatchButton product={product.name}/></div>
      {loading ? <div className="results-state"><Icon name="history" size={24}/><h2>Comparing demo offers…</h2><p>Kelus is normalizing retailer terms for this search.</p></div> : failed ? <div className="results-state"><Icon name="close" size={24}/><h2>Offers could not load</h2><p>Please try the search again. No retailer data was changed.</p></div> : <>{result?.failedProviders.length ? <p className="comparison-note"><Icon name="history" size={17}/>Some demo providers are unavailable. Available providers still appear below.</p> : null}{recommendationCard("Kelus Pick", pick, pickRecommendation)}{recommendationCard("Cheapest", cheapest, cheapestRecommendation)}{recommendationCard("Safest option", safest, safestRecommendation)}
      <div className="controls-row"><button type="button" className="filter-toggle" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><Icon name="sliders" size={16}/>Filters</button><div className="sort-tabs">{([ ["recommended", "Recommended"], ["lowest", "Lowest price"], ["safest", "Safest"] ] as const).map(([value, label]) => <button key={value} className={sort === value ? "active" : ""} onClick={() => setSort(value)}>{label}</button>)}</div></div>
      {filterOpen && <aside className="filter-panel" aria-label="Offer filters"><label><b>Maximum price</b><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any price"/></label><label><b>Retailer</b><select value={retailer} onChange={(event) => setRetailer(event.target.value)}><option value="all">All retailers</option>{retailers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><input type="checkbox" checked={warrantyOnly} onChange={(event) => setWarrantyOnly(event.target.checked)}/> Warranty details</label><label><input type="checkbox" checked={returnsOnly} onChange={(event) => setReturnsOnly(event.target.checked)}/> Clear return terms</label><button className="button button-secondary" onClick={applyFilter}>Apply filters</button></aside>}
      <p className="comparison-note"><Icon name="shield" size={17}/>Kelus compares retailer terms and evidence. Retailers handle the purchase.</p>{!filteredOffers.length ? <div className="results-state"><Icon name="search" size={24}/><h2>No matching offers</h2><p>Try another condition, variant, or remove a filter. The catalog remains available even when demo retailers have no offer.</p></div> : <div className="offer-list">{sortedOffers.map((offer) => <OfferCard offer={offer} key={offer.id}/>)}</div>}</>}</div>
      <aside className="insights-panel"><div className="product-summary"><span className="product-mark"><span>{product.image}</span></span><div><p className="eyebrow">Product overview</p><h2>{product.name}</h2><p>{variant?.label ?? "Variant not selected"} · Demo data</p></div></div><div className="insight-card"><span className="insight-label">Price context · demo</span><strong>{priceContext.currentTrustedPrice === null ? "—" : `$${priceContext.currentTrustedPrice}`}</strong><p>90-day average {priceContext.average90Day === null ? "—" : `$${priceContext.average90Day}`} · recent low {priceContext.recentLow === null ? "—" : `$${priceContext.recentLow}`}.</p><Link href="/compare/iphone-17" className="text-link" onClick={() => trackEvent({ name: "offer_compared", offerId: pick?.id ?? "" })}>Compare the evidence <Icon name="arrow" size={15}/></Link></div><div className="insight-card"><div className="insight-title"><span>Price history · illustrative</span><b>{priceContext.verdict}</b></div><PriceChart points={priceHistory}/><p>Illustrative values only until live provider data is connected.</p></div></aside></section>
  </main>;
}
