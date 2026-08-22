"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceChart } from "@/components/PriceChart";
import { ProductMark } from "@/components/ProductMark";
import { SearchControls } from "@/components/SearchControls";
import { WatchButton } from "@/components/WatchButton";
import { getProductBySlug, getVariantById, getVariantsForProduct, priceHistory } from "@/lib/demo-data";
import { readSearchCriteria, searchCriteriaToQuery } from "@/lib/search-state";
import { getPriceContext } from "@/services/price-context";
import { getRecommendation, sortOffers } from "@/services/recommendations";
import { retrySearch, startSearch } from "@/services/search-session";
import type { ConditionFilter, Offer, OfferSearchResult, Product, ProductVariant, Retailer } from "@/types/kelus";

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

function cheaperTradeoff(pick: Offer, alternative: Offer) {
  const savings = (knownTotal(pick) ?? pick.price) - (knownTotal(alternative) ?? alternative.price);
  if (alternative.condition !== pick.condition) return `Save $${savings} by choosing ${alternative.condition} condition.`;
  if (alternative.seller.sellerType !== pick.seller.sellerType) return `Save $${savings} with seller terms that differ from a retailer purchase.`;
  return `Save $${savings}; review delivery and return terms before choosing.`;
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
  const router = useRouter();
  const product = getProductBySlug(criteria.productSlug)!;
  const variant = getVariantById(criteria.variantId);
  const variants = useMemo(() => getVariantsForProduct(product.id), [product.id]);
  const [result, setResult] = useState<OfferSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("We couldn't load eBay offers right now.");
  const [condition, setCondition] = useState<ConditionFilter>("any");
  const [retailer, setRetailer] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startSearch(criteria)
      .then((next) => { if (!cancelled) setResult(next); })
      .catch((error) => { if (!cancelled) { setErrorMessage(error instanceof Error ? error.message : "We couldn't load eBay offers right now."); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
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
  const cheaperOption = pick && knownTotal(pick) !== null ? [...filteredOffers].filter((offer) => knownTotal(offer) !== null && total(offer) < total(pick)).sort((a, b) => total(a) - total(b))[0] : undefined;
  const otherOffers = sorted.filter((offer) => offer.id !== pick?.id && offer.id !== cheaperOption?.id);
  const context = getPriceContext(filteredOffers, result?.observations ?? []);

  function changeVariant(variantId: string) {
    router.push(`/results?${searchCriteriaToQuery({ ...criteria, variantId })}`);
  }

  function retry() {
    setLoading(true);
    setFailed(false);
    retrySearch(criteria).then(setResult).catch(() => setFailed(true)).finally(() => setLoading(false));
  }

  return <main className="app-page rp-shell">
    <ResultsSidebar />
    <div className="rp-body">
      <div className="rp-topbar">
        <SearchControls minimal initialCriteria={criteria}/>
        <div className="rp-topbar-actions">
          <Link href="/saved" className="rp-icon-btn" aria-label="Watchlist"><Icon name="heart" size={19}/></Link>
          <Link href="/saved" className="rp-icon-btn rp-icon-btn--dot" aria-label="Notifications"><Icon name="bell" size={19}/></Link>
        </div>
      </div>
      <div className="rp-columns">
        <section>
          <ProductSummary product={product} variantLabel={variant?.label} condition={criteria.condition} count={filteredOffers.length} loading={loading} live={result ? !result.isDemo : false} lastUpdated={result?.lastUpdated} editing={editing} onToggleEditing={() => setEditing((open) => !open)} />
          {!loading && !failed && <p className="rp-live-note"><Icon name="check" size={15}/>Live eBay offers are currently available. Additional retailers are being added.</p>}
          {editing && <div className="rp-edit-panel"><SearchControls compact initialCriteria={criteria}/></div>}
          {!loading && !failed && <ResultsFilters condition={condition} maxPrice={maxPrice} retailer={retailer} retailers={retailers} sort={sort} variantId={variant?.id ?? ""} variants={variants} onCondition={setCondition} onMaxPrice={setMaxPrice} onRetailer={setRetailer} onSort={setSort} onVariant={changeVariant} />}
          {loading ? <LoadingState /> : failed ? <ErrorState message={errorMessage} onRetry={retry} /> : !filteredOffers.length ? <NoResultsState /> : <div className="rp-offers">
            {pick && <OurPick offer={pick} reasons={recommendation?.reasons ?? []}/>}
            {cheaperOption && pick && <CheaperOption offer={cheaperOption} tradeoff={cheaperTradeoff(pick, cheaperOption)}/>}
            {otherOffers.map((offer) => <OfferRow key={offer.id} offer={offer}/>)}
          </div>}
          <p className="rp-disclaimer">Results currently cover matching live eBay listings, not the entire market. Kelus may earn a commission from eligible retailer links; no eBay campaign tracking is added unless configured.</p>
        </section>
        <PriceContextPanel context={context}/>
      </div>
    </div>
  </main>;
}

function ResultsSidebar() {
  return <aside className="rp-sidebar">
    <Link href="/" className="wordmark rp-sidebar-logo" aria-label="Kelus home">kelus</Link>
    <nav className="rp-nav" aria-label="Results navigation">
      <Link href="/results" className="rp-nav-item is-active"><Icon name="search" size={18}/>Search</Link>
      <span className="rp-nav-item is-disabled"><Icon name="tag" size={18}/>Deals</span>
      <span className="rp-nav-item is-disabled"><Icon name="trending" size={18}/>Price tracker</span>
      <Link href="/saved" className="rp-nav-item"><Icon name="heart" size={18}/>Watchlist</Link>
    </nav>
  </aside>;
}

function ProductSummary({ product, variantLabel, condition, count, loading, live, lastUpdated, editing, onToggleEditing }: { product: Product; variantLabel?: string; condition: ConditionFilter; count: number; loading: boolean; live: boolean; lastUpdated?: string; editing: boolean; onToggleEditing: () => void }) {
  return <div className="rp-summary">
    <div className="rp-summary-main">
      <ProductMark label={product.image}/>
      <div className="rp-summary-body">
        <h1>{product.name}</h1>
        <p>{[variantLabel, condition === "any" ? "Any condition" : titleCase(condition), "Unlocked"].filter(Boolean).join(" · ")}</p>
        <p className="rp-summary-location"><Icon name="pin" size={15}/>United States</p>
        <div className="rp-summary-actions">
          <button className="button button-secondary rp-edit-search" type="button" onClick={onToggleEditing}>{editing ? "Close search" : "Edit search"}</button>
          <WatchButton product={product.name}/>
        </div>
      </div>
    </div>
    <div className="rp-summary-status">
      <span className="rp-offer-count"><i/>{loading ? "Checking eBay…" : `${count} matching ${live ? "live " : ""}offer${count === 1 ? "" : "s"}`}</span>
      <span className="rp-updated"><Icon name="refresh" size={13}/>{loading ? "Refreshing offers…" : updatedLabel(lastUpdated)}</span>
    </div>
  </div>;
}

function ResultsFilters({ condition, maxPrice, retailer, retailers, sort, variantId, variants, onCondition, onMaxPrice, onRetailer, onSort, onVariant }: { condition: ConditionFilter; maxPrice: string; retailer: string; retailers: Retailer[]; sort: SortMode; variantId: string; variants: ProductVariant[]; onCondition: (value: ConditionFilter) => void; onMaxPrice: (value: string) => void; onRetailer: (value: string) => void; onSort: (value: SortMode) => void; onVariant: (value: string) => void }) {
  return <div className="rp-filterbar" aria-label="Offer filters">
    <div className="rp-filterbar-fields">
      <label>Condition<select value={condition} onChange={(event) => onCondition(event.target.value as ConditionFilter)}><option value="any">All</option><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></label>
      <label>Storage<select value={variantId} onChange={(event) => onVariant(event.target.value)}>{variants.map((item) => <option key={item.id} value={item.id}>{item.storage ?? item.label}</option>)}</select></label>
      <label>Retailer<select value={retailer} onChange={(event) => onRetailer(event.target.value)}><option value="all">All</option>{retailers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Max price<input type="number" min="0" inputMode="numeric" value={maxPrice} placeholder="Any" aria-label="Maximum total price" onChange={(event) => onMaxPrice(event.target.value)}/></label>
    </div>
    <label>Sort by<select value={sort} onChange={(event) => onSort(event.target.value as SortMode)}><option value="recommended">Best overall</option><option value="lowest">Lowest price</option><option value="highest">Highest price</option></select></label>
  </div>;
}

function LoadingState() {
  return <div className="results-state"><Icon name="history"/><h2>Comparing offers…</h2><p>Kelus is organizing product, retailer, and price information.</p></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="results-state"><Icon name="close"/><h2>We couldn&apos;t load eBay offers right now.</h2><p>{message}</p><button className="button button-primary" type="button" onClick={onRetry}>Try again</button></div>;
}

function NoResultsState() {
  return <div className="results-state"><Icon name="search"/><h2>No matching eBay offers found for this configuration.</h2><p>Try another condition, storage option, or price limit.</p></div>;
}

function OurPick({ offer, reasons }: { offer: Offer; reasons: string[] }) {
  return <article className="rp-pick">
    <span className="rp-pick-label"><Icon name="star" size={13}/>OUR PICK</span>
    <OfferRow offer={offer} highlighted />
    <div className="rp-why"><Icon name="sparkle" size={16}/><div><b>Why we picked it</b><p>{reasons.slice(0, 3).join(" · ")}</p></div></div>
  </article>;
}

function CheaperOption({ offer, tradeoff }: { offer: Offer; tradeoff: string }) {
  return <article className="rp-cheaper-option">
    <span className="rp-cheaper-label">CHEAPER OPTION</span>
    <OfferRow offer={offer} compact />
    <p>{tradeoff}</p>
  </article>;
}

function OfferRow({ offer, highlighted = false, compact = false }: { offer: Offer; highlighted?: boolean; compact?: boolean }) {
  return <div className={`rp-row${highlighted ? "" : " rp-row--plain"}${compact ? " rp-row--compact" : ""}`}>
    <div className="rp-row-lead">
      <span className="rp-row-logo" aria-hidden="true">{offer.retailer.logo}</span>
      <div><div className="rp-row-name"><strong>{offer.retailer.name}</strong>{offer.dataSource === "live" && <span className="rp-badge">Live</span>}</div><p className="rp-row-meta">{titleCase(offer.condition)} · {offer.delivery ?? "Shipping details unavailable"}</p><p className="rp-row-meta">{offer.seller.name ?? "Seller name unavailable"}{offer.seller.feedbackPercentage !== undefined ? " · " + offer.seller.feedbackPercentage + "% feedback" : ""}</p><p className="rp-row-meta">{returnTerms(offer)}</p></div>
    </div>
    <div className="rp-row-price"><strong>${knownTotal(offer) ?? offer.price}</strong><span>{knownTotal(offer) === null ? "Item price" : "Item + shipping"}</span>{offer.shippingCostKnown === false ? <em>Shipping not provided</em> : offer.shippingCost > 0 ? <em>Includes ${offer.shippingCost} shipping</em> : <em>Free shipping</em>}</div>
    {!compact && <ul className="rp-row-checks"><li><Icon name="check" size={15}/>{offer.warranty ?? "Warranty information unavailable"}</li><li><Icon name="check" size={15}/>{returnTerms(offer)}</li></ul>}
    <span className={highlighted ? "rp-row-cta" : "rp-row-cta rp-row-cta--outline"}><OutboundRetailerCTA offer={offer}/></span>
  </div>;
}

function PriceContextPanel({ context }: { context: ReturnType<typeof getPriceContext> }) {
  const comparisonAverage = context.average90Day ?? context.average30Day;
  const difference = context.currentTrustedPrice && comparisonAverage ? Math.round((1 - context.currentTrustedPrice / comparisonAverage) * 100) : null;
  return <aside className="rp-insights">
    <section className="rp-panel"><h2>Price context</h2>{context.isDemo ? <><PriceChart points={priceHistory}/><div className="rp-chart-stats"><div><span>90-day average</span><strong>{context.average90Day ? `$${context.average90Day}` : "—"}</strong></div><div><span>Recent low</span><strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></div></div><p className="rp-demo-caption">Illustrative price history.</p></> : context.historyStatus === "ready" ? <div className="rp-chart-stats"><div><span>Observed 30-day average</span><strong>{context.average30Day ? `$${context.average30Day}` : "—"}</strong></div><div><span>Recent observed low</span><strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></div></div> : <p className="rp-rating-support">Price history is building from {context.observationCount} live observation{context.observationCount === 1 ? "" : "s"}. A single day is not treated as historical insight.</p>}</section>
    <section className="rp-panel"><h2>Price rating</h2><p className="rp-rating-heading">{context.verdict}</p><p className="rp-rating-support">{difference === null ? "Not enough live price history yet." : `The current known total is ${Math.abs(difference)}% ${difference >= 0 ? "below" : "above"} the recent observed average.`}</p></section>
    <section className="rp-panel"><h2><Icon name="bell" size={16}/>Set price alert</h2><p className="rp-alert-copy">Save this product and return when live alerts are available.</p><Link href="/saved" className="button button-primary rp-alert-submit">Track price</Link></section>
  </aside>;
}
