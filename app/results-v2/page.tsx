"use client";
/* eslint-disable @next/next/no-img-element */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EbayWordmark } from "@/components/EbayWordmark";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceChart } from "@/components/PriceChart";
import { ProductMark } from "@/components/ProductMark";
import { WatchButton } from "@/components/WatchButton";
import { ProductHeader } from "@/components/ProductHeader";
import { SafeLink as Link } from "@/components/SafeLink";
import { getProductBySlug, getVariantById, getVariantsForProduct } from "@/lib/demo-data";
import { getProductIntelligenceOptions } from "@/lib/product-attributes";
import { canonicalProductPath, getAlternativeProductCriteria, readSearchCriteria } from "@/lib/search-state";
import { getBuyWaitDecision } from "@/services/buy-wait-decision";
import { clientOfferRefreshMode } from "@/services/client-offer-refresh-policy";
import { buildKelusDecision, type KelusDecision } from "@/services/decision-engine";
import { getPriceContext } from "@/services/price-context";
import { exactRealPriceObservations } from "@/services/price-intelligence";
import { settleProductOfferLoad, type ProductOfferLoadOutcome } from "@/services/product-offer-load";
import { getCheaperAlternative } from "@/services/recommendations";
import { optimizedRetailerImageUrl } from "@/services/retailer-image";
import { readCachedSearch, retrySearch, startSearch } from "@/services/search-session";
import { trackEvent } from "@/services/analytics";
import type { ConditionFilter, Offer, OfferSearchResult, PriceObservation, Product, ProductVariant, SearchCriteria } from "@/types/kelus";

const knownTotal = (offer: Offer) => offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
const titleCase = (value: string) => value.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

function updatedLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Update time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "Updated now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  return "Updated recently";
}

function staleUpdatedLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Stale snapshot · Last update unavailable";
  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
  return `Stale snapshot · Last updated ${formatted} UTC`;
}

function realHistoryPoints(observations: PriceObservation[]) {
  const daily = new Map<string, number>();
  observations.filter((item) => !item.isDemo && item.shippingCost !== null && item.shippingCost !== undefined && !Number.isNaN(Date.parse(item.timestamp))).forEach((item) => {
    const day = item.timestamp.slice(0, 10);
    const total = item.price + (item.shippingCost ?? 0);
    daily.set(day, Math.min(daily.get(day) ?? Number.POSITIVE_INFINITY, total));
  });
  return [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([day, price]) => ({ label: day.slice(5), price: Math.round(price) }));
}

export default function NewResultsPage() {
  return <Suspense fallback={<main className="nr-page"><div className="nr-state">Preparing your comparison…</div></main>}><NewResults/></Suspense>;
}

function NewResults() {
  const params = useSearchParams();
  const criteria = useMemo(() => readSearchCriteria(new URLSearchParams(params.toString())), [params]);
  useEffect(() => { window.location.replace(canonicalProductPath(criteria)); }, [criteria]);
  return <main className="nr-page"><div className="nr-state">Opening the canonical product comparison…</div></main>;
}

export function ProductIntelligenceView({ criteria, initialOutcome }: { criteria: ReturnType<typeof readSearchCriteria>; initialOutcome?: ProductOfferLoadOutcome }) {
  const product = getProductBySlug(criteria.productSlug)!;
  const variant = getVariantById(criteria.variantId);
  const variants = useMemo(() => getVariantsForProduct(product.id).filter((item) => product.searchAttribute.validVariantIds.includes(item.id)), [product]);
  const cachedResult = useMemo(() => readCachedSearch(criteria)?.result ?? null, [criteria]);
  const serverResult = initialOutcome && initialOutcome.status !== "ERROR" ? initialOutcome.result : null;
  const [result, setResult] = useState<OfferSearchResult | null>(serverResult ?? cachedResult);
  const [loading, setLoading] = useState(!initialOutcome && !result);
  const [error, setError] = useState(initialOutcome?.status === "ERROR" ? initialOutcome.message : "");
  const [attempt, setAttempt] = useState(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const refreshMode = clientOfferRefreshMode(initialOutcome, attempt);
    if (refreshMode === "none") return;
    const refreshPersistedResult = attempt === 0 && Boolean(serverResult);
    let cancelled = false;
    let idleId: number | undefined;
    let timerId: number | undefined;
    const refresh = () => {
      const request = attempt > 0 || cachedResult ? retrySearch(criteria) : startSearch(criteria);
      settleProductOfferLoad(request).then((outcome) => {
        if (cancelled) return;
        // A persisted server snapshot is already useful, validated primary content.
        // Let the refresh update persistence without replacing the first rendered
        // recommendation and creating a late LCP candidate for this visit.
        if (refreshPersistedResult) return;
        if (outcome.status === "ERROR") {
          setResult(null);
          setError(outcome.message);
        } else {
          setResult((current) => outcome.status === "EMPTY" && current?.offers.length
            ? {
              ...current,
              servedFromCache: true,
              refreshRecommended: true,
              snapshotState: current.snapshotState === "expired" ? "expired" : "stale",
              lastRefreshAttemptAt: new Date().toISOString(),
              lastRefreshReturnedEmpty: true,
            }
            : outcome.result);
          setError("");
        }
        setLoading(false);
      });
    };
    if (refreshMode === "idle") {
      const idleWindow = window as unknown as {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (idleWindow.requestIdleCallback) idleId = idleWindow.requestIdleCallback(refresh, { timeout: 3_000 });
      else timerId = window.setTimeout(refresh, 1_500);
    } else refresh();
    return () => {
      cancelled = true;
      const idleWindow = window as unknown as { cancelIdleCallback?: (id: number) => void };
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [attempt, cachedResult, criteria, initialOutcome, serverResult]);

  const retry = () => {
    setResult(null);
    setError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  };

  const offers = result?.offers ?? [];
  const storedObservations = result?.observationsStored ? result.observations : [];
  const context = getPriceContext(criteria, storedObservations);
  const decision = buildKelusDecision(criteria, offers, context);
  const pick = decision.pick;
  const cheaperAlternative = pick ? getCheaperAlternative(offers, pick) : null;
  const lowest = decision.cheapest && decision.cheapest.id !== pick?.id ? decision.cheapest : cheaperAlternative?.offer;
  const otherOffers = offers.filter((offer) => offer.id !== pick?.id && offer.id !== lowest?.id);
  const heroOffer = pick ?? offers[0];
  const staleSnapshot = result?.snapshotState === "stale" || result?.snapshotState === "expired" || result?.lastRefreshFailed || result?.lastRefreshReturnedEmpty;
  const alternativeCriteria = useMemo(() => getAlternativeProductCriteria(criteria), [criteria]);

  useEffect(() => {
    trackEvent({ name: "product_page_viewed", productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
  }, [criteria.condition, criteria.productSlug, criteria.variantId]);

  useEffect(() => {
    if (pick) trackEvent({ name: "recommendation_viewed", productSlug: criteria.productSlug, offerId: pick.id, confidence: decision.confidence });
  }, [criteria.productSlug, decision.confidence, pick]);

  return <main className={`nr-page pi-page${updating ? " is-updating" : ""}`}>
    <ProductHeader criteria={criteria} />
    <div className="pi-content section">
      <section className="pi-product"><ListingImage offer={heroOffer} productName={product.name} fallbackLabel={product.image} large/><div className="pi-product-copy"><p className="pi-kicker">{product.brand} · {product.category}</p><h1>{product.name}</h1><VariantSelectors product={product} variants={variants} criteria={criteria} selectedVariant={variant} onUpdating={() => setUpdating(true)}/><DataFreshness result={result} offerCount={offers.length} loading={loading} stale={Boolean(staleSnapshot)}/><p className={`pi-updating${updating ? " is-visible" : ""}`} role="status" aria-live="polite">Updating recommendation…</p></div></section>
      {error ? <ProductFallbackState kind="error" detail={error} alternatives={alternativeCriteria} criteria={criteria} productName={product.name} retry={retry}/> : loading && !result ? <ProductLoadingSkeleton/> : !offers.length ? <ProductFallbackState kind={result?.lastUpdated ? "empty" : "starting"} alternatives={alternativeCriteria} criteria={criteria} productName={product.name} retry={retry}/> : <>
        <DecisionReport decision={decision} lowest={lowest}/>
        <TimingAndTrack context={context} observations={exactRealPriceObservations(storedObservations, { variantId: criteria.variantId ?? "", condition: criteria.condition })} productName={product.name} criteria={criteria} result={result!}/>
        {otherOffers.length > 0 && <section className="pi-section"><p className="pi-label">Other offers</p><div className="pi-offer-list">{otherOffers.map((offer) => <OtherOffer key={offer.id} offer={offer} productName={product.name} fallbackLabel={product.image} stale={Boolean(staleSnapshot)}/>)}</div></section>}
        <section className="pi-method"><p className="pi-label">Methodology</p><p>Kelus uses persisted last-known-good eBay snapshots for the first render, then refreshes connected offers in the background. Recommendations only use comparable offers that pass product, variant, condition, seller, shipping, return, confidence, and anomaly checks.</p><Link className="text-link" href="/methodology">See how Kelus picks an offer <Icon name="arrow" size={14}/></Link></section>
        <p className="nr-disclosure">Live results currently cover matching eBay listings, not the entire market. Kelus may earn a commission from eligible retailer links.</p>
      </>}
    </div>
  </main>;
}

function ProductLoadingSkeleton() {
  return <section className="pi-pick pi-loading" aria-busy="true" aria-live="polite">
    <p className="pi-label">Our Pick</p>
    <div className="pi-loading-body">
      <div className="pi-loading-price">
        <span className="pi-loading-block pi-loading-block--sm"/>
        <span className="pi-loading-block pi-loading-block--lg"/>
        <span className="pi-loading-block pi-loading-block--md"/>
      </div>
      <div className="pi-loading-seller">
        <span className="pi-loading-block pi-loading-block--md"/>
        <span className="pi-loading-block pi-loading-block--sm"/>
      </div>
    </div>
    <div className="pi-loading-verdict">
      <span className="pi-loading-block pi-loading-block--sm"/>
      <span className="pi-loading-block pi-loading-block--md"/>
      <span className="pi-loading-block pi-loading-block--sm"/>
    </div>
    <span className="pi-loading-block pi-loading-block--cta"/>
    <p className="pi-loading-status" role="status">Comparing live eBay offers…</p>
  </section>;
}

function DataFreshness({ result, offerCount, loading, stale }: { result: OfferSearchResult | null; offerCount: number; loading: boolean; stale: boolean }) {
  const state = loading && !result ? "checking" : stale && offerCount ? "snapshot" : offerCount ? "live" : "empty";
  const label = state === "checking" ? "CHECKING EBAY" : state === "snapshot" ? "SAVED EBAY SNAPSHOT" : state === "live" ? "LIVE EBAY OFFERS" : "NO VALIDATED OFFERS";
  const detail = state === "checking" ? "Resolving this configuration" : state === "snapshot" ? staleUpdatedLabel(result?.lastUpdated) : state === "live" ? `${offerCount} offer${offerCount === 1 ? "" : "s"} · ${updatedLabel(result?.lastUpdated)}` : updatedLabel(result?.lastUpdated);
  return <p className={`pi-freshness is-${state}`}><span><i aria-hidden="true"/>{label}</span><small>{detail}</small></p>;
}

function ProductFallbackState({ kind, detail, alternatives, criteria, productName, retry }: { kind: "error" | "empty" | "starting"; detail?: string; alternatives: SearchCriteria[]; criteria: SearchCriteria; productName: string; retry: () => void }) {
  const copy = kind === "error"
    ? { title: "We couldn’t refresh this comparison.", body: detail || "The connected offer source did not respond. No retailer information has been invented or replaced." }
    : kind === "empty"
      ? { title: "No comparable offers right now.", body: "Kelus checked this exact configuration, but no listing passed the current product, variant, condition, and trust checks." }
      : { title: "This comparison is being prepared.", body: "Kelus has no saved validated offer snapshot for this exact configuration yet. A live check has started in the background." };
  return <section className="nr-state pi-fallback" aria-live="polite">
    <div className="pi-fallback-copy"><p className="pi-label">Offer status</p><h2>{copy.title}</h2><p>{copy.body}</p></div>
    <div className="nr-state-actions"><button type="button" className="button button-primary" onClick={retry}>Check again</button><Link className="button button-secondary" href="/#product-search">Edit search</Link></div>
    <div className="pi-fallback-track"><div><b>Keep this exact configuration</b><span>Save it to My Alerts so Kelus can check again when validated offers become available.</span></div><WatchButton product={productName} criteria={criteria} allowUnavailable/></div>
    {alternatives.length > 0 && <div className="pi-fallback-alternatives"><p>Try another supported configuration</p><div>{alternatives.map((alternative) => <Link key={`${alternative.variantId}-${alternative.condition}`} href={canonicalProductPath(alternative)}>{alternativeLabel(alternative)} <Icon name="arrow" size={13}/></Link>)}</div></div>}
    <Link className="text-link pi-fallback-method" href="/methodology">Why Kelus may reject an offer <Icon name="arrow" size={14}/></Link>
  </section>;
}

function alternativeLabel(criteria: SearchCriteria) {
  const variant = getVariantById(criteria.variantId);
  const condition = criteria.condition === "any" ? "Any condition" : titleCase(criteria.condition);
  return `${variant?.label ?? "Standard"} · ${condition}`;
}

function VariantSelectors({ product, variants, criteria, selectedVariant, onUpdating }: { product: Product; variants: ProductVariant[]; criteria: SearchCriteria; selectedVariant?: ProductVariant; onUpdating: () => void }) {
  const selectedLabel = selectedVariant?.label ?? "Unavailable";
  const options = getProductIntelligenceOptions(product, variants);
  function navigate(next: Partial<SearchCriteria>) {
    const nextCriteria = { ...criteria, ...next };
    try {
      onUpdating();
      window.location.assign(canonicalProductPath(nextCriteria));
    } catch {
      onUpdating();
    }
  }
  return <div className="pi-selectors" aria-label="Product options">
    {options.attributeLabel && <><label><span className="sr-only">{options.attributeLabel}</span><select aria-label={options.attributeLabel} value={criteria.variantId ?? ""} onChange={(event) => navigate({ variantId: event.target.value })}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select></label><i aria-hidden="true">·</i></>}
    <label><span className="sr-only">Condition</span><select aria-label="Condition" value={criteria.condition} onChange={(event) => navigate({ condition: event.target.value as ConditionFilter })}>{(["any", "new", "used", "refurbished"] as ConditionFilter[]).map((condition) => <option key={condition} value={condition}>{condition === "any" ? "Any condition" : titleCase(condition)}</option>)}</select></label>
    {options.showsUnlockedStatus && <><i aria-hidden="true">·</i><span className="pi-fixed-option" aria-label="Network: Unlocked">Unlocked</span></>}
    <i aria-hidden="true">·</i><details><summary>More options</summary><p>Secondary details such as color vary by live listing and do not change this comparison. Current identity: {selectedLabel} · {criteria.condition === "any" ? "Any condition" : titleCase(criteria.condition)}{options.showsUnlockedStatus ? " · Unlocked" : ""}.</p></details>
  </div>;
}

function money(offer?: Offer | null) {
  if (!offer) return "—";
  const total = knownTotal(offer) ?? offer.price;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency, maximumFractionDigits: Number.isInteger(total) ? 0 : 2 }).format(total);
}

function moneyAmount(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
}

function confidenceCopy(confidence: KelusDecision["confidence"]) {
  if (confidence === "HIGH") return "Strong structured product, condition, and seller evidence.";
  if (confidence === "MEDIUM") return "The product match is supported, but some market evidence is limited.";
  if (confidence === "LOW") return "Important listing evidence is limited or needs stronger validation.";
  return "No recommendation-quality offer is available yet.";
}

function offerMeta(offer: Offer) {
  const shipping = offer.shippingCostKnown === false ? "Shipping unavailable" : offer.shippingCost ? `+$${offer.shippingCost} shipping` : "Free shipping";
  const returns = offer.returnPolicy && !/unavailable|unknown/i.test(offer.returnPolicy) ? offer.returnPolicy : "Return terms unavailable";
  return `${titleCase(offer.condition)} · ${shipping} · ${returns}`;
}

function EvidenceReveal({ pick, tradeoff }: { pick: Offer; tradeoff: string }) {
  const shipping = pick.shippingCostKnown === false ? "Not supplied by eBay" : pick.shippingCost ? `${moneyAmount(pick.shippingCost, pick.currency)} shipping included in the known total` : "Free shipping reported by eBay";
  const seller = pick.seller.feedbackPercentage ? `${pick.seller.feedbackPercentage}% positive feedback${pick.seller.topRated ? " · Top Rated" : ""}` : pick.seller.topRated ? "Top Rated seller" : "Seller evidence is limited";
  const returns = pick.returnPolicy && !/unavailable|unknown/i.test(pick.returnPolicy) ? pick.returnPolicy : "Not supplied by eBay";
  const match = pick.trust?.reasons?.length ? pick.trust.reasons.slice(0, 2).join(" · ") : "Comparable offer accepted by the current matching rules";
  const anomaly = pick.trust ? pick.trust.suspiciousPrice ? "Price anomaly detected" : "No suspicious-price flag" : "Price-anomaly evidence unavailable";
  return <details className="pi-proof" open>
    <summary><span><b>Why this offer won</b><small>See the evidence behind Our Pick</small></span><Icon name="chevron" size={18}/></summary>
    <div className="pi-proof-reveal"><dl>
      <div><dt>Match</dt><dd>{match}</dd></div>
      <div><dt>Known total</dt><dd>{money(pick)} · {shipping}</dd></div>
      <div><dt>Seller</dt><dd>{seller}</dd></div>
      <div><dt>Returns</dt><dd>{returns}</dd></div>
      <div><dt>Price check</dt><dd>{anomaly}</dd></div>
    </dl><p>{tradeoff}</p><Link href="/methodology">Read the full methodology <Icon name="arrow" size={13}/></Link></div>
  </details>;
}

function kelusVerdict(decision: KelusDecision, lowest?: Offer | null) {
  const pick = decision.pick;
  if (!pick) return null;
  if (!lowest || lowest.id === pick.id) {
    return { title: "This is the strongest validated offer.", detail: "No cheaper comparable offer passed the current Kelus checks." };
  }
  if (lowest.trust?.suspiciousPrice) {
    return { title: "Skip the cheapest offer.", detail: decision.cheaperTradeoff ?? "Its price is unusually low and the available evidence is not strong enough for Our Pick." };
  }
  if (lowest.trust?.confidence === "LOW" && decision.confidence !== "LOW") {
    return { title: "The cheapest offer is not the stronger pick.", detail: decision.cheaperTradeoff ?? "Our Pick has stronger validation evidence for this exact configuration." };
  }
  return { title: "The lower price comes with a trade-off.", detail: decision.cheaperTradeoff ?? "Kelus found a cheaper comparable offer, but the available evidence favors Our Pick." };
}

function DecisionReport({ decision, lowest }: { decision: KelusDecision; lowest?: Offer | null }) {
  const pick = decision.pick;
  const tradeoff = decision.cheaperTradeoff ?? "Kelus did not find a meaningfully cheaper comparable offer with different trade-offs.";
  const pickTotal = pick ? knownTotal(pick) : null;
  const lowestTotal = lowest ? knownTotal(lowest) : null;
  const savings = pickTotal !== null && lowestTotal !== null ? Math.max(0, pickTotal - lowestTotal) : null;
  const verdict = kelusVerdict(decision, lowest);
  return <section className="pi-pick" aria-labelledby="our-pick-heading">
    <p className="pi-label" id="our-pick-heading">Our Pick</p>
    <div className="pi-pick-top">
      <div><span className="pi-total-label">Known total</span><strong className="pi-pick-price">{money(pick)}</strong><p className="pi-confidence">{titleCase(decision.confidence.toLowerCase())} confidence</p><p className="pi-confidence-copy">{confidenceCopy(decision.confidence)}</p><Link className="pi-method-link" href="/methodology">How Kelus chose this <Icon name="arrow" size={13}/></Link></div>
      {pick && <div className="pi-pick-seller"><span className="pi-retailer-line"><span className="pi-retailer-logo"><EbayWordmark/></span><b>{decision.sellerName !== "Seller unavailable" ? decision.sellerName : decision.retailerName}</b></span><small>{offerMeta(pick)}</small></div>}
    </div>
    {verdict && <div className="pi-verdict"><p className="pi-label">Kelus verdict</p><h2>{verdict.title}</h2><p>{verdict.detail}</p></div>}
    <div className="pi-why">
      <p className="pi-label">Why this offer</p>
      <p className="pi-evidence">{decision.reasons.join(" · ")}</p>
      <p className="pi-tradeoff">{tradeoff}</p>
    </div>
    {pick && <EvidenceReveal pick={pick} tradeoff={tradeoff}/>}
    {lowest && lowest.id !== pick?.id ? <><p className="pi-comparison-label">Our Pick vs Cheapest</p><div className="pi-comparison" aria-label="Our Pick compared with the cheapest offer">
      <span>Our Pick</span><strong>{money(pick)}</strong><small>{titleCase(decision.confidence.toLowerCase())} confidence</small>
      <span>Cheapest</span><strong>{money(lowest ?? pick)}</strong><small>{lowest?.trust?.confidence ? `${titleCase(lowest.trust.confidence.toLowerCase())} confidence${savings !== null && savings > 0 ? ` · ${moneyAmount(savings, lowest.currency)} less` : ""}` : "Confidence unavailable"}</small>
    </div></> : <p className="pi-no-cheaper">No cheaper comparable offer passed Kelus validation.</p>}
    {pick && <div className="pi-primary-cta"><OutboundRetailerCTA offer={pick} label="View offer" ourPick/><span>Opens the live eBay listing</span><p className="pi-cta-disclosure">Kelus may earn a commission from eligible retailer links.</p></div>}
  </section>;
}

function ListingImage({ offer, productName, fallbackLabel, large = false }: { offer?: Offer; productName: string; fallbackLabel: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = optimizedRetailerImageUrl(offer?.imageUrl, large ? 300 : 160);
  return <span className={`nr-image${large ? " is-large" : ""}`}>{source && !failed ? <>{/* Retailer image hosts change, so the native element is intentional. */}<img src={source} alt={`${productName} listing`} width={large ? 180 : 80} height={large ? 180 : 80} loading={large ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)}/></> : <ProductMark label={fallbackLabel}/>}</span>;
}

function OtherOffer({ offer, productName, fallbackLabel, stale }: { offer: Offer; productName: string; fallbackLabel: string; stale: boolean }) {
  const [open, setOpen] = useState(false);
  const detailId = `offer-details-${offer.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return <article className={`pi-offer${open ? " is-open" : ""}`}>
    <button className="pi-offer-summary" type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((value) => !value)}>
      <strong>{money(offer)}</strong><span><b className="pi-retailer-line"><span className="pi-retailer-logo"><EbayWordmark compact/></span><span>{offer.seller.name || offer.retailer.name}</span></b><small>{offerMeta(offer)}</small></span><em>{offer.trust?.confidence ? titleCase(offer.trust.confidence.toLowerCase()) : "Unrated"}</em><Icon name="chevron" size={17}/>
    </button>
    <div className="pi-offer-reveal" id={detailId} aria-hidden={!open}><div><div className="pi-offer-detail"><ListingImage offer={offer} productName={productName} fallbackLabel={fallbackLabel}/><div><p>{offer.sourceTitle || `${productName} · ${titleCase(offer.condition)} listing`}</p><small>{offer.seller.feedbackPercentage ? `${offer.seller.feedbackPercentage}% positive · ` : ""}{updatedLabel(offer.lastUpdated)} · {stale ? "Saved eBay offer" : "Live eBay offer"}</small><span className="pi-secondary-cta"><OutboundRetailerCTA offer={offer} compact label="View offer"/></span></div></div></div></div>
  </article>;
}

function TimingAndTrack({ context, observations, productName, criteria, result }: { context: ReturnType<typeof getPriceContext>; observations: PriceObservation[]; productName: string; criteria: SearchCriteria; result: OfferSearchResult }) {
  const points = realHistoryPoints(observations);
  const ready = context.historyStatus === "ready" && points.length > 1;
  const average = context.average90Day ?? context.average30Day;
  const decision = getBuyWaitDecision(context);
  return <section className="pi-section pi-context"><div><p className="pi-label">When to Buy</p><h2>{decision.label}</h2><p>{decision.explanation}</p><div className="nr-context-stats"><span>Current<strong>{context.currentTrustedPrice ? `$${context.currentTrustedPrice}` : "—"}</strong></span><span>Typical<strong>{average ? `$${average}` : "—"}</strong></span><span>Recent low<strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></span></div></div>{ready && <PriceChart points={points}/>}<div className="pi-track"><div><p className="pi-label">Track price</p><p>Keep this exact configuration connected to future real price observations.</p></div><WatchButton product={productName} criteria={criteria} result={result}/></div></section>;
}
