"use client";
/* eslint-disable @next/next/no-img-element */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EbayWordmark } from "@/components/EbayWordmark";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceChart } from "@/components/PriceChart";
import { ProductMark } from "@/components/ProductMark";
import { SearchControls } from "@/components/SearchControls";
import { WatchButton } from "@/components/WatchButton";
import { SafeLink as Link } from "@/components/SafeLink";
import { getProductBySlug, getVariantById, getVariantsForProduct } from "@/lib/demo-data";
import { canonicalProductPath, readSearchCriteria } from "@/lib/search-state";
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
import type { ConditionFilter, Offer, OfferSearchResult, PriceObservation, ProductVariant, SearchCriteria } from "@/types/kelus";

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

  useEffect(() => {
    trackEvent({ name: "product_page_viewed", productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
  }, [criteria.condition, criteria.productSlug, criteria.variantId]);

  useEffect(() => {
    if (pick) trackEvent({ name: "recommendation_viewed", productSlug: criteria.productSlug, offerId: pick.id, confidence: decision.confidence });
  }, [criteria.productSlug, decision.confidence, pick]);

  return <main className={`nr-page pi-page${updating ? " is-updating" : ""}`}>
    <header className="nr-header section"><Link href="/" className="wordmark" aria-label="Kelus home">kelus</Link><SearchControls minimal minimalAction initialCriteria={criteria} actionLabel="Search"/></header>
    <div className="pi-content section">
      <section className="pi-product"><ListingImage offer={heroOffer} productName={product.name} large/><div className="pi-product-copy"><p className="pi-kicker">{product.brand} · {product.category}</p><h1>{product.name}</h1><VariantSelectors variants={variants} criteria={criteria} selectedVariant={variant} onUpdating={() => setUpdating(true)}/><p className="pi-subtitle">{loading && !result ? "Checking connected offers…" : `${offers.length} live offer${offers.length === 1 ? "" : "s"} · ${staleSnapshot ? staleUpdatedLabel(result?.lastUpdated) : updatedLabel(result?.lastUpdated)}`}</p><p className={`pi-updating${updating ? " is-visible" : ""}`} role="status" aria-live="polite">Updating recommendation…</p></div></section>
      {error ? <div className="nr-state"><h2>We couldn&apos;t load live offers.</h2><p>{error}</p><div className="nr-state-actions"><button type="button" className="button button-primary" onClick={retry}>Retry</button><Link className="button button-secondary" href="/#product-search">Edit search</Link></div></div> : loading && !result ? <div className="nr-state">Comparing live eBay offers…</div> : !offers.length ? <div className="nr-state"><h2>No comparable offers right now.</h2><p>Try refreshing the live results or adjust the product configuration.</p><div className="nr-state-actions"><button type="button" className="button button-primary" onClick={retry}>Retry</button><Link className="button button-secondary" href="/#product-search">Edit search</Link></div></div> : <>
        <DecisionReport decision={decision} lowest={lowest}/>
        <TimingAndTrack context={context} observations={exactRealPriceObservations(storedObservations, { variantId: criteria.variantId ?? "", condition: criteria.condition })} productName={product.name} criteria={criteria} result={result!}/>
        {otherOffers.length > 0 && <section className="pi-section"><p className="pi-label">Other offers</p><div className="pi-offer-list">{otherOffers.map((offer) => <OtherOffer key={offer.id} offer={offer} productName={product.name}/>)}</div></section>}
        <section className="pi-method"><p className="pi-label">Methodology</p><p>Kelus uses persisted last-known-good eBay snapshots for the first render, then refreshes connected offers in the background. Recommendations only use comparable offers that pass product, variant, condition, seller, shipping, return, confidence, and anomaly checks.</p></section>
        <p className="nr-disclosure">Live results currently cover matching eBay listings, not the entire market. Kelus may earn a commission from eligible retailer links.</p>
      </>}
    </div>
  </main>;
}

function VariantSelectors({ variants, criteria, selectedVariant, onUpdating }: { variants: ProductVariant[]; criteria: SearchCriteria; selectedVariant?: ProductVariant; onUpdating: () => void }) {
  const selectedLabel = selectedVariant?.label ?? "Unavailable";
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
    <label><span className="sr-only">Storage</span><select aria-label="Storage" value={criteria.variantId ?? ""} onChange={(event) => navigate({ variantId: event.target.value })}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select></label><i aria-hidden="true">·</i>
    <label><span className="sr-only">Condition</span><select aria-label="Condition" value={criteria.condition} onChange={(event) => navigate({ condition: event.target.value as ConditionFilter })}>{(["any", "new", "used", "refurbished"] as ConditionFilter[]).map((condition) => <option key={condition} value={condition}>{condition === "any" ? "Any condition" : titleCase(condition)}</option>)}</select></label><i aria-hidden="true">·</i>
    <label><span className="sr-only">Network</span><select aria-label="Network" value="unlocked" onChange={() => undefined}><option value="unlocked">Unlocked</option></select></label><i aria-hidden="true">·</i>
    <details><summary>More options</summary><p>Color varies by live listing and is not part of the canonical configuration. Current identity: {selectedLabel} · {criteria.condition === "any" ? "Any condition" : titleCase(criteria.condition)} · Unlocked.</p></details>
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

function DecisionReport({ decision, lowest }: { decision: KelusDecision; lowest?: Offer | null }) {
  const pick = decision.pick;
  const tradeoff = decision.cheaperTradeoff ?? "Kelus did not find a meaningfully cheaper comparable offer with different trade-offs.";
  const pickTotal = pick ? knownTotal(pick) : null;
  const lowestTotal = lowest ? knownTotal(lowest) : null;
  const savings = pickTotal !== null && lowestTotal !== null ? Math.max(0, pickTotal - lowestTotal) : null;
  return <section className="pi-pick" aria-labelledby="our-pick-heading">
    <p className="pi-label" id="our-pick-heading">Our Pick</p>
    <div className="pi-pick-top">
      <div><strong className="pi-pick-price">{money(pick)}</strong><p className="pi-confidence">{titleCase(decision.confidence.toLowerCase())} confidence</p><p className="pi-confidence-copy">{confidenceCopy(decision.confidence)}</p></div>
      {pick && <div className="pi-pick-seller"><span><EbayWordmark/>{decision.sellerName !== "Seller unavailable" ? decision.sellerName : decision.retailerName}</span><small>{offerMeta(pick)}</small></div>}
    </div>
    <div className="pi-why">
      <p className="pi-label">Why this one</p>
      <p className="pi-evidence">{decision.reasons.join(" · ")}</p>
      <p className="pi-tradeoff">{tradeoff}</p>
    </div>
    <p className="pi-comparison-label">Our Pick vs Cheapest</p>
    <div className="pi-comparison" aria-label="Our Pick compared with the cheapest offer">
      <span>Our Pick</span><strong>{money(pick)}</strong><small>{titleCase(decision.confidence.toLowerCase())} confidence</small>
      <span>Cheapest</span><strong>{money(lowest ?? pick)}</strong><small>{lowest?.trust?.confidence ? `${titleCase(lowest.trust.confidence.toLowerCase())} confidence${savings !== null && savings > 0 ? ` · ${moneyAmount(savings, lowest.currency)} less` : ""}` : "Confidence unavailable"}</small>
    </div>
    {pick && <div className="pi-primary-cta"><OutboundRetailerCTA offer={pick} label="View offer" ourPick/><span>Opens the live eBay listing</span></div>}
  </section>;
}

function ListingImage({ offer, productName, large = false }: { offer?: Offer; productName: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = optimizedRetailerImageUrl(offer?.imageUrl, large ? 300 : 160);
  return <span className={`nr-image${large ? " is-large" : ""}`}>{source && !failed ? <>{/* Retailer image hosts change, so the native element is intentional. */}<img src={source} alt={`${productName} listing`} width={large ? 180 : 80} height={large ? 180 : 80} loading={large ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)}/></> : <ProductMark label="IPH"/>}</span>;
}

function OtherOffer({ offer, productName }: { offer: Offer; productName: string }) {
  const [open, setOpen] = useState(false);
  const detailId = `offer-details-${offer.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return <article className={`pi-offer${open ? " is-open" : ""}`}>
    <button className="pi-offer-summary" type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((value) => !value)}>
      <strong>{money(offer)}</strong><span><b><EbayWordmark compact/>{offer.seller.name || offer.retailer.name}</b><small>{offerMeta(offer)}</small></span><em>{offer.trust?.confidence ? titleCase(offer.trust.confidence.toLowerCase()) : "Unrated"}</em><Icon name="chevron" size={17}/>
    </button>
    <div className="pi-offer-reveal" id={detailId} aria-hidden={!open}><div><div className="pi-offer-detail"><ListingImage offer={offer} productName={productName}/><div><p>{offer.sourceTitle || `${productName} · ${titleCase(offer.condition)} listing`}</p><small>{offer.seller.feedbackPercentage ? `${offer.seller.feedbackPercentage}% positive · ` : ""}{updatedLabel(offer.lastUpdated)} · Live eBay offer</small><span className="pi-secondary-cta"><OutboundRetailerCTA offer={offer} compact label="View offer"/></span></div></div></div></div>
  </article>;
}

function TimingAndTrack({ context, observations, productName, criteria, result }: { context: ReturnType<typeof getPriceContext>; observations: PriceObservation[]; productName: string; criteria: SearchCriteria; result: OfferSearchResult }) {
  const points = realHistoryPoints(observations);
  const ready = context.historyStatus === "ready" && points.length > 1;
  const average = context.average90Day ?? context.average30Day;
  const decision = getBuyWaitDecision(context);
  return <section className="pi-section pi-context"><div><p className="pi-label">When to Buy</p><h2>{decision.label}</h2><p>{decision.explanation}</p><div className="nr-context-stats"><span>Current<strong>{context.currentTrustedPrice ? `$${context.currentTrustedPrice}` : "—"}</strong></span><span>Typical<strong>{average ? `$${average}` : "—"}</strong></span><span>Recent low<strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></span></div></div>{ready && <PriceChart points={points}/>}<div className="pi-track"><div><p className="pi-label">Track price</p><p>Keep this exact configuration connected to future real price observations.</p></div><WatchButton product={productName} criteria={criteria} result={result}/></div></section>;
}
