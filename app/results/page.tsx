"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SafeLink as Link } from "@/components/SafeLink";
import { EbayWordmark } from "@/components/EbayWordmark";
import { Icon } from "@/components/Icon";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceChart } from "@/components/PriceChart";
import { ProductMark } from "@/components/ProductMark";
import { SearchControls } from "@/components/SearchControls";
import { WatchButton } from "@/components/WatchButton";
import { getProductBySlug, getVariantById, getVariantsForProduct } from "@/lib/demo-data";
import { getRelevantAttributeLabel } from "@/lib/product-attributes";
import { readSearchCriteria, searchCriteriaToQuery } from "@/lib/search-state";
import { getPriceContext } from "@/services/price-context";
import { getCheaperAlternative, getRecommendation, sortOffers } from "@/services/recommendations";
import { readCachedSearch, retrySearch, startSearch } from "@/services/search-session";
import type { ConditionFilter, Offer, OfferSearchResult, PriceObservation, Product, ProductVariant, Retailer } from "@/types/kelus";

type SortMode = "recommended" | "lowest" | "highest";

const total = (offer: Offer) => offer.price + (offer.shippingCost ?? 0);
const knownTotal = (offer: Offer) => offer.shippingCostKnown === false ? null : total(offer);
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);

function updatedLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Update time unavailable";
  const ageMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (ageMinutes < 1) return "Updated less than a minute ago";
  if (ageMinutes < 60) return `Updated ${ageMinutes} minute${ageMinutes === 1 ? "" : "s"} ago`;
  return "Updated " + new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function returnTerms(offer: Offer) {
  if (!offer.returnPolicy) return "Return terms unavailable";
  const days = offer.returnPolicy.match(/(\d+)-day/)?.[1];
  if (!days) return offer.returnPolicy;
  return offer.seller.sellerType === "retailer" ? `${days}-day retailer returns` : `${days}-day seller return terms`;
}

function realHistoryPoints(observations: PriceObservation[]) {
  const dailyLows = new Map<string, number>();
  observations
    .filter((observation) => !observation.isDemo && observation.shippingCost !== null && observation.shippingCost !== undefined && !Number.isNaN(Date.parse(observation.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .forEach((observation) => {
      const day = observation.timestamp.slice(0, 10);
      const value = observation.price + (observation.shippingCost ?? 0);
      dailyLows.set(day, Math.min(dailyLows.get(day) ?? Number.POSITIVE_INFINITY, value));
    });
  return [...dailyLows.entries()].slice(-6).map(([day, price]) => ({
    label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)),
    price: Math.round(price),
  }));
}

export default function ResultsPage() {
  return <Suspense fallback={<LoadingShell />}><Results /></Suspense>;
}

function LoadingShell() {
  return <main className="app-page rp-shell"><div className="rp-body"><div className="results-state"><Icon name="history"/><h2>Preparing your comparison…</h2></div></div></main>;
}

function Results() {
  const params = useSearchParams();
  const criteria = useMemo(() => readSearchCriteria(new URLSearchParams(params.toString())), [params]);
  return <ResultsContent key={params.toString()} criteria={criteria}/>;
}

function ResultsContent({ criteria }: { criteria: ReturnType<typeof readSearchCriteria> }) {
  const product = getProductBySlug(criteria.productSlug)!;
  const variant = getVariantById(criteria.variantId);
  const variants = useMemo(() => getVariantsForProduct(product.id), [product.id]);
  const attributeLabel = getRelevantAttributeLabel(product, variants);
  const [result, setResult] = useState<OfferSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshWarning, setRefreshWarning] = useState("");
  const [errorMessage, setErrorMessage] = useState("We couldn't load eBay offers right now.");
  const [condition, setCondition] = useState<ConditionFilter>("any");
  const [retailer, setRetailer] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedSearch(criteria);
    if (cached) {
      queueMicrotask(() => {
        if (cancelled) return;
        setResult(cached.result);
        setLoading(false);
        setRefreshing(true);
      });
    }
    (cached ? retrySearch(criteria) : startSearch(criteria))
      .then((next) => { if (!cancelled) setResult(next); })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "We couldn't load eBay offers right now.";
        if (cached) setRefreshWarning("Showing your most recent live results. Refresh when your connection improves.");
        else { setErrorMessage(message); setFailed(true); }
      })
      .finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false); } });
    return () => { cancelled = true; };
  }, [criteria]);

  const retailers = [...new Map((result?.offers ?? []).map((offer) => [offer.retailer.id, offer.retailer])).values()];
  const filteredOffers = useMemo(() => (result?.offers ?? []).filter((offer) => {
    const priceMatches = !maxPrice || (knownTotal(offer) !== null && total(offer) <= Number(maxPrice));
    return (condition === "any" || offer.condition === condition) && (retailer === "all" || offer.retailer.id === retailer) && priceMatches;
  }), [condition, maxPrice, result?.offers, retailer]);
  const sorted = useMemo(() => sortOffers(filteredOffers, sort), [filteredOffers, sort]);
  const recommendation = getRecommendation(filteredOffers, "kelus_pick");
  const pick = filteredOffers.find((offer) => offer.id === recommendation?.offerId);
  const cheaperAlternative = pick ? getCheaperAlternative(filteredOffers, pick) : null;
  const cheaperOption = cheaperAlternative?.offer;
  const otherOffers = sorted.filter((offer) => offer.id !== pick?.id && offer.id !== cheaperOption?.id);
  const context = getPriceContext(filteredOffers, result?.observations ?? []);

  function changeVariant(variantId: string) {
    window.location.assign(`/results?${searchCriteriaToQuery({ ...criteria, variantId })}`);
  }

  function retry() {
    setLoading(true);
    setFailed(false);
    setRefreshWarning("");
    retrySearch(criteria).then(setResult).catch((error) => { setErrorMessage(error instanceof Error ? error.message : "We couldn't load eBay offers right now."); setFailed(true); }).finally(() => setLoading(false));
  }

  return <main className="app-page rp-shell">
    <ResultsSidebar />
    <div className="rp-body">
      <div className="rp-topbar">
        <SearchControls minimal initialCriteria={criteria} resultPath="/results"/>
        <div className="rp-topbar-actions">
          <Link href="/saved" className="rp-icon-btn" aria-label="Watchlist"><Icon name="heart" size={19}/></Link>
          <Link href="/saved" className="rp-icon-btn rp-icon-btn--dot" aria-label="Notifications"><Icon name="bell" size={19}/></Link>
        </div>
      </div>
      <div className="rp-columns">
        <section>
          <ProductSummary product={product} criteria={criteria} result={result} variantLabel={variant?.label} condition={criteria.condition} count={filteredOffers.length} loading={loading} refreshing={refreshing} live={result ? !result.isDemo : false} lastUpdated={result?.lastUpdated} editing={editing} onToggleEditing={() => setEditing((open) => !open)} />
          {refreshWarning && <div className="rp-refresh-warning" role="status"><Icon name="history" size={15}/><span>{refreshWarning}</span><button type="button" onClick={retry}>Refresh</button></div>}
          {editing && <div className="rp-edit-panel"><SearchControls compact initialCriteria={criteria} resultPath="/results" actionLabel="Compare prices"/></div>}
          {!loading && !failed && <ResultsFilters attributeLabel={attributeLabel} condition={condition} maxPrice={maxPrice} retailer={retailer} retailers={retailers} sort={sort} variantId={variant?.id ?? ""} variants={variants} onCondition={setCondition} onMaxPrice={setMaxPrice} onRetailer={setRetailer} onSort={setSort} onVariant={changeVariant} />}
          {loading ? <LoadingState /> : failed ? <ErrorState message={errorMessage} onRetry={retry} /> : !filteredOffers.length ? <NoResultsState /> : <div className="rp-offers">
            {pick && <OurPick offer={pick} productName={product.name} reasons={recommendation?.reasons ?? []}/>}
            {cheaperOption && cheaperAlternative && <CheaperOption offer={cheaperOption} productName={product.name} tradeoff={cheaperAlternative.tradeoff}/>}
            {otherOffers.length > 0 && <div className="rp-other-label">Other offers</div>}
            {otherOffers.map((offer) => <OfferRow key={offer.id} offer={offer} productName={product.name}/>)}
          </div>}
          <p className="rp-disclaimer">Results currently cover matching live eBay listings, not the entire market. Kelus may earn a commission from eligible retailer links; no eBay campaign tracking is added unless configured.</p>
        </section>
        <PriceContextPanel context={context} observations={result?.observations ?? []}/>
      </div>
    </div>
  </main>;
}

function ResultsSidebar() {
  return <aside className="rp-sidebar">
    <Link href="/" className="wordmark rp-sidebar-logo" aria-label="Kelus home">kelus</Link>
    <nav className="rp-nav" aria-label="Results navigation">
      <Link href="/#product-search" className="rp-nav-item is-active"><Icon name="search" size={18}/>Search</Link>
      <span className="rp-nav-item is-disabled"><Icon name="tag" size={18}/>Deals</span>
      <span className="rp-nav-item is-disabled"><Icon name="trending" size={18}/>Price tracker</span>
      <Link href="/saved" className="rp-nav-item"><Icon name="heart" size={18}/>Watchlist</Link>
    </nav>
  </aside>;
}

function ProductSummary({ product, criteria, result, variantLabel, condition, count, loading, refreshing, live, lastUpdated, editing, onToggleEditing }: { product: Product; criteria: ReturnType<typeof readSearchCriteria>; result: OfferSearchResult | null; variantLabel?: string; condition: ConditionFilter; count: number; loading: boolean; refreshing: boolean; live: boolean; lastUpdated?: string; editing: boolean; onToggleEditing: () => void }) {
  return <div className="rp-summary">
    <div className="rp-summary-main">
      <ProductMark label={product.image}/>
      <div className="rp-summary-body">
        <span className="rp-section-label">Product</span>
        <h1>{product.name}</h1>
        <p>{[variantLabel, condition === "any" ? "Any condition" : titleCase(condition), "Unlocked"].filter(Boolean).join(" · ")}</p>
        <p className="rp-summary-source">{loading ? "Checking connected offers…" : live ? `Live eBay offers · ${updatedLabel(lastUpdated)}` : "Demo offers · Illustrative data"}</p>
        <div className="rp-summary-actions">
          <button className="button button-secondary rp-edit-search" type="button" onClick={onToggleEditing}>{editing ? "Close search" : "Edit search"}</button>
          <WatchButton product={product.name} criteria={criteria} result={result}/>
        </div>
      </div>
    </div>
    <div className="rp-summary-status">
      <span className={`rp-offer-count${refreshing ? " is-refreshing" : ""}`}><i/>{loading ? "Checking live prices…" : `${count} matching ${live ? "live " : ""}offer${count === 1 ? "" : "s"}`}</span>
      {refreshing && <span className="rp-updated"><Icon name="refresh" size={13}/>Refreshing quietly…</span>}
    </div>
  </div>;
}

function ResultsFilters({ attributeLabel, condition, maxPrice, retailer, retailers, sort, variantId, variants, onCondition, onMaxPrice, onRetailer, onSort, onVariant }: { attributeLabel: string | null; condition: ConditionFilter; maxPrice: string; retailer: string; retailers: Retailer[]; sort: SortMode; variantId: string; variants: ProductVariant[]; onCondition: (value: ConditionFilter) => void; onMaxPrice: (value: string) => void; onRetailer: (value: string) => void; onSort: (value: SortMode) => void; onVariant: (value: string) => void }) {
  return <div className="rp-filterbar" aria-label="Offer filters">
    <div className="rp-filterbar-fields">
      <label>Condition<select value={condition} onChange={(event) => onCondition(event.target.value as ConditionFilter)}><option value="any">All</option><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></label>
      {attributeLabel && <label>{attributeLabel}<select value={variantId} onChange={(event) => onVariant(event.target.value)}>{variants.map((item) => <option key={item.id} value={item.id}>{attributeLabel === "Storage" ? item.storage ?? item.label : item.label}</option>)}</select></label>}
      <label>Retailer<select value={retailer} onChange={(event) => onRetailer(event.target.value)}><option value="all">All</option>{retailers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Max price<input type="number" min="0" inputMode="numeric" value={maxPrice} placeholder="Any" aria-label="Maximum total price" onChange={(event) => onMaxPrice(event.target.value)}/></label>
    </div>
    <label>Sort by<select value={sort} onChange={(event) => onSort(event.target.value as SortMode)}><option value="recommended">Best overall</option><option value="lowest">Lowest price</option><option value="highest">Highest price</option></select></label>
  </div>;
}

function LoadingState() {
  return <div className="rp-loading" role="status" aria-live="polite">
    <div className="rp-loading-copy"><span className="rp-loading-pulse"><Icon name="search" size={17}/></span><div><h2>Comparing live eBay offers</h2><p>Checking prices, shipping, seller quality, and availability.</p></div></div>
    {[0, 1, 2].map((item) => <div className="rp-skeleton-row" key={item} aria-hidden="true"><i/><div><b/><span/><span/></div><strong/><em/></div>)}
  </div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="results-state"><Icon name="close"/><h2>We couldn&apos;t load eBay offers right now.</h2><p>{message}</p><button className="button button-primary" type="button" onClick={onRetry}>Try again</button></div>;
}

function NoResultsState() {
  return <div className="results-state"><Icon name="search"/><h2>No matching eBay offers found for this configuration.</h2><p>Try another condition, configuration, or price limit.</p></div>;
}

function OurPick({ offer, productName, reasons }: { offer: Offer; productName: string; reasons: string[] }) {
  return <article className="rp-pick">
    <span className="rp-pick-label"><Icon name="star" size={13}/>Our Pick</span>
    <OfferRow offer={offer} productName={productName} highlighted />
    <div className="rp-why"><Icon name="sparkle" size={16}/><div><b>Why we picked it</b><p>{reasons.slice(0, 3).join(" · ")}</p></div></div>
  </article>;
}

function CheaperOption({ offer, productName, tradeoff }: { offer: Offer; productName: string; tradeoff: string }) {
  return <article className="rp-cheaper-option">
    <span className="rp-cheaper-label">Cheaper option</span>
    <OfferRow offer={offer} productName={productName} compact />
    <p>{tradeoff}</p>
  </article>;
}

function RetailerLogo({ offer }: { offer: Offer }) {
  if (offer.retailer.id === "ebay") {
    return <span className="rp-row-logo rp-row-logo--ebay"><EbayWordmark compact/></span>;
  }
  return <span className="rp-row-logo" aria-hidden="true">{offer.retailer.logo}</span>;
}

function OfferImage({ offer, productName }: { offer: Offer; productName: string }) {
  const source = offer.imageUrl?.startsWith("https://") ? offer.imageUrl : undefined;
  const [failed, setFailed] = useState(false);
  return <span className="rp-product-image">
    {/* Retailer images use changing third-party hosts, so the native element is intentional here. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {source && !failed ? <img src={source} alt={`${productName} listing from ${offer.retailer.name}`} loading="lazy" onError={() => setFailed(true)}/> : <span className="rp-product-image-fallback" aria-hidden="true"><Icon name="tag" size={22}/></span>}
  </span>;
}

function OfferRow({ offer, productName, highlighted = false, compact = false }: { offer: Offer; productName: string; highlighted?: boolean; compact?: boolean }) {
  return <div className={`rp-row${highlighted ? "" : " rp-row--plain"}${compact ? " rp-row--compact" : ""}`}>
    <div className="rp-row-lead">
      <OfferImage offer={offer} productName={productName}/>
      <div className="rp-row-details"><div className="rp-row-retailer"><RetailerLogo offer={offer}/><strong>{offer.retailer.name}</strong></div><p className="rp-row-source">{offer.dataSource === "live" ? `Live ${offer.retailer.name} offer · ${updatedLabel(offer.lastUpdated)}` : "Demo offer · Illustrative data"}</p></div>
    </div>
    <div className="rp-row-price"><strong>${knownTotal(offer) ?? offer.price}</strong><span>{knownTotal(offer) === null ? "Item price" : "Item + shipping"}</span>{offer.shippingCostKnown === false ? <em>Shipping not provided</em> : offer.shippingCost > 0 ? <em>Includes ${offer.shippingCost} shipping</em> : <em>Free shipping</em>}</div>
    <div className="rp-row-terms"><strong>{titleCase(offer.condition)}</strong><span>{offer.delivery ?? "Delivery details unavailable"}</span><span>{returnTerms(offer)}</span></div>
    <span className={highlighted ? "rp-row-cta" : "rp-row-cta rp-row-cta--outline"}><OutboundRetailerCTA offer={offer}/></span>
  </div>;
}

function PriceContextPanel({ context, observations }: { context: ReturnType<typeof getPriceContext>; observations: PriceObservation[] }) {
  const comparisonAverage = context.average90Day ?? context.average30Day;
  const difference = context.currentTrustedPrice && comparisonAverage ? Math.round((1 - context.currentTrustedPrice / comparisonAverage) * 100) : null;
  const points = realHistoryPoints(observations);
  const historyReady = context.historyStatus === "ready" && points.length > 1;
  const verdict = !historyReady ? "Price history is building" : difference !== null && difference >= 5 ? "Good time to buy" : difference !== null && difference <= -5 ? "Above the typical price" : "Near the typical price";
  return <aside className="rp-insights">
    <section className="rp-panel rp-price-context"><div className="rp-panel-heading"><h2>Price context</h2><span className={`rp-source-chip${context.isDemo ? " is-demo" : ""}`}>{context.isDemo ? "Demo" : "Live data"}</span></div><p className="rp-rating-heading">{verdict}</p>{historyReady && <PriceChart points={points}/>}<div className="rp-chart-stats rp-chart-stats--three"><div><span>Current price</span><strong>{context.currentTrustedPrice ? `$${context.currentTrustedPrice}` : "—"}</strong></div><div><span>Typical price</span><strong>{comparisonAverage ? `$${comparisonAverage}` : "—"}</strong></div><div><span>Recent low</span><strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></div></div><p className="rp-rating-support">{historyReady && difference !== null ? `The current known total is ${Math.abs(difference)}% ${difference >= 0 ? "below" : "above"} the recent observed average.` : context.isDemo ? "Demo offers do not create historical price insight." : `Building from ${context.observationCount} live observation${context.observationCount === 1 ? "" : "s"}.`}</p></section>
    <section className="rp-panel"><h2><Icon name="bell" size={16}/>Price alert</h2><p className="rp-alert-copy">Save this product and return when live alerts are available.</p><Link href="/saved" className="button button-primary rp-alert-submit">Track price</Link></section>
  </aside>;
}
