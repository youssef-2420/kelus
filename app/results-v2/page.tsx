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
import { getProductBySlug, getVariantById } from "@/lib/demo-data";
import { readSearchCriteria } from "@/lib/search-state";
import { getPriceContext } from "@/services/price-context";
import { getCheaperAlternative, getRecommendation } from "@/services/recommendations";
import { readCachedSearch, retrySearch, startSearch } from "@/services/search-session";
import type { Offer, OfferSearchResult, PriceObservation } from "@/types/kelus";

const knownTotal = (offer: Offer) => offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);

function updatedLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Update time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "Updated now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  return "Updated recently";
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
  const product = getProductBySlug(criteria.productSlug)!;
  const variant = getVariantById(criteria.variantId);
  const cachedResult = useMemo(() => readCachedSearch(criteria)?.result ?? null, [criteria]);
  const [result, setResult] = useState<OfferSearchResult | null>(cachedResult);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const request = cachedResult ? retrySearch(criteria) : startSearch(criteria);
    request.then((next) => { if (!cancelled) setResult(next); }).catch((reason) => { if (!cancelled && !cachedResult) setError(reason instanceof Error ? reason.message : "Live offers are unavailable."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cachedResult, criteria]);

  const offers = result?.offers ?? [];
  const recommendation = getRecommendation(offers, "kelus_pick");
  const pick = offers.find((offer) => offer.id === recommendation?.offerId);
  const cheaperAlternative = pick ? getCheaperAlternative(offers, pick) : null;
  const lowest = cheaperAlternative?.offer;
  const otherOffers = offers.filter((offer) => offer.id !== pick?.id && offer.id !== lowest?.id);
  const context = getPriceContext(offers, result?.observations ?? []);
  const heroOffer = pick ?? offers[0];

  return <main className="nr-page">
    <header className="nr-header section"><Link href="/" className="wordmark" aria-label="Kelus home">kelus</Link><SearchControls minimal minimalAction initialCriteria={criteria} resultPath="/results-v2" actionLabel="Search"/></header>
    <div className="nr-content section">
      <section className="nr-product"><ListingImage offer={heroOffer} productName={product.name} large/><div><h1>{product.name}</h1><p>{[variant?.label, criteria.condition === "any" ? "Any condition" : titleCase(criteria.condition), "Unlocked"].filter(Boolean).join(" · ")}</p><span>{loading ? "Checking connected offers…" : `${offers.length} live offer${offers.length === 1 ? "" : "s"} checked`}</span></div></section>
      {error ? <div className="nr-state"><h2>We couldn&apos;t load live offers.</h2><p>{error}</p></div> : loading && !result ? <div className="nr-state">Comparing live eBay offers…</div> : !offers.length ? <div className="nr-state">No matching live eBay offers found.</div> : <>
        {pick && <section className="nr-section"><p className="nr-label is-accent">Our Pick</p><FeaturedOffer offer={pick} productName={product.name} reasons={recommendation?.reasons ?? []}/></section>}
        {lowest && cheaperAlternative && <section className="nr-section"><div className="nr-label-row"><p className="nr-label">Lowest price</p><b>Save ${cheaperAlternative.savings}</b></div><LowestOffer offer={lowest} productName={product.name} tradeoff={cheaperAlternative.tradeoff}/></section>}
        {otherOffers.length > 0 && <section className="nr-section"><p className="nr-label">Other offers</p><div className="nr-other-list">{otherOffers.map((offer) => <OtherOffer key={offer.id} offer={offer} productName={product.name}/>)}</div></section>}
        <PriceContext context={context} observations={result?.observations ?? []}/>
        <section className="nr-section nr-alert-section"><div><p className="nr-label">Price alert</p><h2>Want a better price?</h2><p>Track this product and come back when the price changes.</p></div><WatchButton product={product.name} criteria={criteria} result={result}/></section>
        <p className="nr-disclosure">Live results currently cover matching eBay listings, not the entire market. Kelus may earn a commission from eligible retailer links.</p>
      </>}
    </div>
  </main>;
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
  return <article className="nr-feature-card"><div className="nr-feature-top"><OfferIdentity offer={offer} productName={productName}/><strong>${knownTotal(offer) ?? offer.price}</strong></div><div className="nr-why"><b>Why we picked it</b><p>{reasons.slice(0, 3).join(" · ") || "Strong balance of known price and seller terms among connected offers."}</p></div><span className="nr-cta"><OutboundRetailerCTA offer={offer}/></span></article>;
}

function LowestOffer({ offer, productName, tradeoff }: { offer: Offer; productName: string; tradeoff: string }) {
  return <article className="nr-low-card"><div className="nr-feature-top"><OfferIdentity offer={offer} productName={productName}/><strong>${knownTotal(offer) ?? offer.price}</strong></div><div className="nr-tradeoff"><b>Trade-off</b><p>{tradeoff}</p></div><span className="nr-cta is-outline"><OutboundRetailerCTA offer={offer}/></span></article>;
}

function OtherOffer({ offer, productName }: { offer: Offer; productName: string }) {
  const [open, setOpen] = useState(false);
  const detailId = `offer-details-${offer.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return <article className={`nr-other${open ? " is-open" : ""}`}>
    <button className="nr-other-summary" type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((value) => !value)}>
      <EbayWordmark compact/><span><b>{offer.sourceTitle || `${productName} · ${titleCase(offer.condition)} listing`}</b><small>{titleCase(offer.condition)} · {offer.shippingCostKnown === false ? "Shipping unavailable" : offer.shippingCost ? `+$${offer.shippingCost} shipping` : "Free shipping"} · {offer.returnPolicy ?? "Return terms unavailable"}</small></span><strong>${knownTotal(offer) ?? offer.price}</strong><Icon name="chevron" size={17}/>
    </button>
    <div className="nr-other-reveal" id={detailId} aria-hidden={!open}><div><div className="nr-other-detail"><ListingImage offer={offer} productName={productName}/><div><p>{offer.seller.feedbackPercentage ? `${offer.seller.feedbackPercentage}% positive · ` : ""}{offer.seller.name || "Seller name unavailable"}</p><small>{updatedLabel(offer.lastUpdated)} · Live eBay offer</small><span className="nr-cta"><OutboundRetailerCTA offer={offer}/></span></div></div></div></div>
  </article>;
}

function PriceContext({ context, observations }: { context: ReturnType<typeof getPriceContext>; observations: PriceObservation[] }) {
  const points = realHistoryPoints(observations);
  const ready = context.historyStatus === "ready" && points.length > 1;
  const average = context.average90Day ?? context.average30Day;
  return <section className="nr-section nr-context"><p className="nr-label">Price context</p><div className="nr-context-card"><div><h2>{ready ? "Is now a good time to buy?" : "Price history is building."}</h2><p>{ready ? "Compare today’s known total with the recent observed range." : `Kelus has ${context.observationCount} live observation${context.observationCount === 1 ? "" : "s"}. More real history is needed before showing a verdict.`}</p><div className="nr-context-stats"><span>Current<strong>{context.currentTrustedPrice ? `$${context.currentTrustedPrice}` : "—"}</strong></span><span>Typical<strong>{average ? `$${average}` : "—"}</strong></span><span>Recent low<strong>{context.recentLow ? `$${context.recentLow}` : "—"}</strong></span></div></div>{ready && <PriceChart points={points}/>}</div></section>;
}
