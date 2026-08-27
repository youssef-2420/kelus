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
import { buildKelusDecision, type KelusDecision } from "@/services/decision-engine";
import { getPriceContext } from "@/services/price-context";
import { exactRealPriceObservations } from "@/services/price-intelligence";
import { settleProductOfferLoad, type ProductOfferLoadOutcome } from "@/services/product-offer-load";
import { getCheaperAlternative } from "@/services/recommendations";
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
    const refreshPersistedResult = attempt === 0 && Boolean(initialOutcome);
    let cancelled = false;
    const request = attempt > 0 || cachedResult ? retrySearch(criteria) : startSearch(criteria);
    settleProductOfferLoad(request).then((outcome) => {
      if (cancelled) return;
      if (outcome.status === "ERROR") {
        if (!refreshPersistedResult) {
          setResult(null);
          setError(outcome.message);
        }
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
    return () => { cancelled = true; };
  }, [attempt, cachedResult, criteria, initialOutcome, serverResult?.refreshRecommended]);

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
      {updating && <p className="pi-updating" role="status">Updating recommendation…</p>}
        <section className="pi-product"><ListingImage offer={heroOffer} productName={product.name} large/><div><p className="pi-kicker">{product.brand} · {product.category}</p><h1>{product.name}</h1><p className="pi-subtitle">{loading && !result ? "Checking connected offers…" : `${offers.length} live offer${offers.length === 1 ? "" : "s"} checked · ${staleSnapshot ? staleUpdatedLabel(result?.lastUpdated) : updatedLabel(result?.lastUpdated)}`}</p><VariantSelectors variants={variants} criteria={criteria} selectedVariant={variant} onUpdating={() => setUpdating(true)}/></div></section>
      {error ? <div className="nr-state"><h2>We couldn&apos;t load live offers.</h2><p>{error}</p><button type="button" className="button button-primary" onClick={retry}>Retry</button></div> : loading && !result ? <div className="nr-state">Comparing live eBay offers…</div> : !offers.length ? <div className="nr-state"><p>No matching live eBay offers found.</p><button type="button" className="button button-primary" onClick={retry}>Retry</button></div> : <>
        <DecisionSummary decision={decision} productName={product.name} criteria={criteria} result={result!}/>
        {pick && <section className="pi-section"><p className="pi-label">Why this one</p><FeaturedOffer offer={pick} productName={product.name} reasons={decision.reasons}/></section>}
        {lowest && <section className="pi-section"><p className="pi-label">Our Pick vs Cheapest</p><LowestOffer offer={lowest} productName={product.name} pick={pick} tradeoff={decision.cheaperTradeoff ?? cheaperAlternative?.tradeoff ?? "Cheaper, but Kelus found weaker confidence, seller, shipping, or return evidence."}/></section>}
        <PriceContext context={context} observations={exactRealPriceObservations(storedObservations, { variantId: criteria.variantId ?? "", condition: criteria.condition })}/>
        <section className={`pi-track${decision.trackRecommended ? " is-recommended" : ""}`}><div><p className="pi-label">Track price</p><h2>{decision.trackRecommended ? "Track this before deciding." : "Keep watching this product."}</h2><p>{decision.trackRecommended ? "Kelus needs more real history or sees a reason to wait, so tracking is the next best move." : "Track it to keep the decision connected to real future observations."}</p></div><WatchButton product={product.name} criteria={criteria} result={result}/></section>
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
    <label>Storage<select value={criteria.variantId ?? ""} onChange={(event) => navigate({ variantId: event.target.value })}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select></label>
    <label>Condition<select value={criteria.condition} onChange={(event) => navigate({ condition: event.target.value as ConditionFilter })}>{(["any", "new", "used", "refurbished"] as ConditionFilter[]).map((condition) => <option key={condition} value={condition}>{condition === "any" ? "Any condition" : titleCase(condition)}</option>)}</select></label>
    <label>Network<select value="unlocked" onChange={() => undefined}><option value="unlocked">Unlocked</option></select></label>
    <details><summary>More options</summary><p>Color is handled by matching live listing evidence when available. Current canonical identity is {selectedLabel} · {criteria.condition === "any" ? "Any condition" : titleCase(criteria.condition)} · Unlocked.</p></details>
  </div>;
}

function DecisionSummary({ decision, productName, criteria, result }: { decision: KelusDecision; productName: string; criteria: ReturnType<typeof readSearchCriteria>; result: OfferSearchResult }) {
  const pick = decision.pick;
  const decisionLabel = decision.buyWaitDecision.label;
  return <section className="pi-pick">
    <div className="pi-pick-main">
      <p className="pi-label">Our Pick</p>
      <h2>{pick ? "OUR PICK" : "NO PICK YET"}</h2>
      <p>{pick ? `${decision.retailerName}${decision.sellerName !== "Seller unavailable" ? ` · ${decision.sellerName}` : ""}` : "Kelus did not find a recommendation-quality offer."}</p>
      <strong>{decision.totalPrice ? `$${decision.totalPrice}` : "—"}</strong>
      <span>{decision.confidence} confidence</span>
    </div>
    <div className="pi-pick-side">
      <p className="pi-label">When to Buy</p>
      <b>{decisionLabel}</b>
      <p>{decision.buyWaitDecision.explanation}</p>
      {pick ? <OutboundRetailerCTA offer={pick}/> : <WatchButton product={productName} criteria={criteria} result={result}/>}
    </div>
  </section>;
}

function ListingImage({ offer, productName, large = false }: { offer?: Offer; productName: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = offer?.imageUrl?.startsWith("https://") ? offer.imageUrl : undefined;
  return <span className={`nr-image${large ? " is-large" : ""}`}>{source && !failed ? <>{/* Retailer image hosts change, so the native element is intentional. */}<img src={source} alt={`${productName} listing`} onError={() => setFailed(true)}/></> : <ProductMark label="IPH"/>}</span>;
}

function OfferIdentity({ offer, productName }: { offer: Offer; productName: string }) {
  return <div className="nr-offer-identity"><ListingImage offer={offer} productName={productName}/><div><div className="nr-retailer"><EbayWordmark/><b>{offer.retailer.name}</b></div><p>{titleCase(offer.condition)} · {offer.shippingCostKnown === false ? "Shipping unavailable" : offer.shippingCost ? `+$${offer.shippingCost} shipping` : "Free shipping"} · {offer.returnPolicy ?? "Return terms unavailable"}</p></div></div>;
}

function FeaturedOffer({ offer, productName, reasons }: { offer: Offer; productName: string; reasons: string[] }) {
  return <article className="pi-why"><OfferIdentity offer={offer} productName={productName}/><ul>{reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}</ul><span className="pi-cta"><OutboundRetailerCTA offer={offer}/></span></article>;
}

function LowestOffer({ offer, productName, pick, tradeoff }: { offer: Offer; productName: string; pick?: Offer | null; tradeoff: string }) {
  return <article className="pi-compare"><div><span>Our Pick</span><strong>{pick ? `$${knownTotal(pick) ?? pick.price}` : "—"}</strong></div><div><span>Cheapest</span><strong>${knownTotal(offer) ?? offer.price}</strong></div><p>{tradeoff}</p><OfferIdentity offer={offer} productName={productName}/><span className="pi-secondary-cta"><OutboundRetailerCTA offer={offer} compact/></span></article>;
}

function OtherOffer({ offer, productName }: { offer: Offer; productName: string }) {
  const [open, setOpen] = useState(false);
  const detailId = `offer-details-${offer.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return <article className={`pi-offer${open ? " is-open" : ""}`}>
    <button className="pi-offer-summary" type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((value) => !value)}>
      <EbayWordmark compact/><span><b>{offer.sourceTitle || `${productName} · ${titleCase(offer.condition)} listing`}</b><small>{titleCase(offer.condition)} · {offer.shippingCostKnown === false ? "Shipping unavailable" : offer.shippingCost ? `+$${offer.shippingCost} shipping` : "Free shipping"} · {offer.returnPolicy ?? "Return terms unavailable"}</small></span><strong>${knownTotal(offer) ?? offer.price}</strong><Icon name="chevron" size={17}/>
    </button>
    <div className="pi-offer-reveal" id={detailId} aria-hidden={!open}><div><div className="pi-offer-detail"><ListingImage offer={offer} productName={productName}/><div><p>{offer.seller.feedbackPercentage ? `${offer.seller.feedbackPercentage}% positive · ` : ""}{offer.seller.name || "Seller name unavailable"}</p><small>{updatedLabel(offer.lastUpdated)} · Live eBay offer</small><span className="pi-secondary-cta"><OutboundRetailerCTA offer={offer} compact/></span></div></div></div></div>
  </article>;
}

function PriceContext({ context, observations }: { context: ReturnType<typeof getPriceContext>; observations: PriceObservation[] }) {
  const points = realHistoryPoints(observations);
  const ready = context.historyStatus === "ready" && points.length > 1;
  const average = context.average90Day ?? context.average30Day;
  const decision = getBuyWaitDecision(context);
  return <section className="pi-section pi-context"><p className="pi-label">When to Buy</p><div><h2>{decision.label}</h2><p>{decision.explanation}</p><div className="nr-context-stats"><span>Current<strong>{context.currentTrustedPrice ? `$${context.currentTrustedPrice}` : "—"}</strong></span><span>Typical<strong>{average ? `$${average}` : "—"}</strong></span><span>Recent low<strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></span></div></div>{ready && <PriceChart points={points}/>}</section>;
}
