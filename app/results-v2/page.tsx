"use client";
/* eslint-disable @next/next/no-img-element */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Icon } from "@/components/Icon";
import { EbayWordmark } from "@/components/EbayWordmark";
import { OutboundRetailerCTA } from "@/components/OutboundRetailerCTA";
import { PriceHistorySparkline } from "@/components/PriceHistorySparkline";
import { NotifyWhenLive } from "@/components/NotifyWhenLive";
import { ProductMark } from "@/components/ProductMark";
import { WatchButton } from "@/components/WatchButton";
import { ProductHeader } from "@/components/ProductHeader";
import { SafeLink as Link } from "@/components/SafeLink";
import { getProductBySlug, getVariantById, getVariantsForProduct } from "@/lib/demo-data";
import { getProductIntelligenceOptions } from "@/lib/product-attributes";
import { canonicalProductPath, getAlternativeProductCriteria, readSearchCriteria } from "@/lib/search-state";
import { getCriteriaListingPreview, rankAlternativeCriteria } from "@/lib/catalog-availability";
import { readBundledSnapshot } from "@/lib/bundled-snapshot-catalog";
import { historyPointsFromObservations } from "@/lib/price-history-points";
import { ebaySellerProfileUrl } from "@/lib/seller-links";
import { getBuyWaitDecision } from "@/services/buy-wait-decision";
import { clientOfferRefreshMode } from "@/services/client-offer-refresh-policy";
import { buildKelusDecision, type KelusDecision } from "@/services/decision-engine";
import { getPriceContext } from "@/services/price-context";
import { exactRealPriceObservations, minimum30DaySamples } from "@/services/price-intelligence";
import { settleProductOfferLoad, type ProductOfferLoadOutcome } from "@/services/product-offer-load";
import { getCheaperAlternative } from "@/services/recommendations";
import { optimizedRetailerImageUrl } from "@/services/retailer-image";
import { readCachedSearch, retrySearch, startSearch } from "@/services/search-session";
import { trackEvent } from "@/services/analytics";
import type { ConditionFilter, Offer, OfferSearchResult, PriceObservation, Product, ProductVariant, SearchCriteria } from "@/types/kelus";

const knownTotal = (offer: Offer) => offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
const titleCase = (value: string) => value.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

function productPageHeading(product: Product, variant?: ProductVariant, condition?: SearchCriteria["condition"]) {
  const name = [product.name, variant?.label].filter(Boolean).join(" ");
  if (!condition || condition === "any") return name;
  return `${name} — ${titleCase(condition)}`;
}

function updatedLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Update time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

function staleUpdatedLabel(value?: string, snapshotState?: OfferSearchResult["snapshotState"]) {
  if (!value || Number.isNaN(Date.parse(value))) return "Validated comparison · Last update unavailable";
  const ageMs = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(ageMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (snapshotState === "expired" || days >= 7) {
    const formatted = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
    return `Older snapshot · Last updated ${formatted} UTC`;
  }
  if (days >= 1) return `Saved comparison · Updated ${days} day${days === 1 ? "" : "s"} ago`;
  if (hours >= 1) return `Saved comparison · Updated ${hours} hr ago`;
  if (minutes >= 1) return `Saved comparison · Updated ${minutes} min ago`;
  return "Saved comparison · Updated just now";
}

function snapshotLooksVisuallyStale(result: OfferSearchResult | null) {
  if (!result) return false;
  if (result.snapshotState === "expired" || result.lastRefreshFailed || result.lastRefreshReturnedEmpty) return true;
  if (!result.lastUpdated || Number.isNaN(Date.parse(result.lastUpdated))) return false;
  return Date.now() - Date.parse(result.lastUpdated) > 24 * 60 * 60 * 1_000;
}

export default function NewResultsPage() {
  return <Suspense fallback={<main className="nr-page"><div className="nr-state">Opening your comparison…</div></main>}><NewResults/></Suspense>;
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
  const [updating, setUpdating] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("kelus-pi-updating") === "1");
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const criteriaKey = `${criteria.productSlug}:${criteria.variantId ?? ""}:${criteria.condition}`;
  const previousCriteriaKey = useRef(criteriaKey);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kelus-pi-updating") === "1") sessionStorage.removeItem("kelus-pi-updating");
  }, []);

  useEffect(() => {
    if (previousCriteriaKey.current === criteriaKey) return;
    previousCriteriaKey.current = criteriaKey;
    const cached = readCachedSearch(criteria)?.result ?? null;
    queueMicrotask(() => {
      setUpdating(true);
      setResult(cached);
      setLoading(!cached);
      setError("");
      setAttempt(0);
      setRefreshingSnapshot(false);
      if (cached) setUpdating(false);
    });
  }, [criteriaKey, criteria]);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    if (updating) queueMicrotask(() => setUpdating(false));
  }, [loading, updating]);

  useEffect(() => {
    const refreshMode = clientOfferRefreshMode(initialOutcome, attempt);
    if (refreshMode === "none") return;
    const refreshPersistedResult = attempt === 0 && Boolean(serverResult);
    let cancelled = false;
    let idleId: number | undefined;
    let timerId: number | undefined;
    const refresh = () => {
      setBackgroundRefreshing(true);
      if (refreshPersistedResult) setRefreshingSnapshot(true);
      const request = attempt > 0 || cachedResult ? retrySearch(criteria) : startSearch(criteria);
      settleProductOfferLoad(request).then((outcome) => {
        if (cancelled) return;
        setRefreshingSnapshot(false);
        // A persisted server snapshot is already useful, validated primary content.
        // Let the refresh update persistence without replacing the first rendered
        // recommendation and creating a late LCP candidate for this visit.
        if (refreshPersistedResult) return;
        if (outcome.status === "ERROR") {
          if (!result?.offers.length && !serverResult?.offers.length) {
            setError("");
            setLoading(false);
            setUpdating(false);
            return;
          }
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
        setUpdating(false);
      }).finally(() => {
        if (!cancelled) setBackgroundRefreshing(false);
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
  const staleSnapshot = snapshotLooksVisuallyStale(result);
  const showRefreshBanner = backgroundRefreshing || (Boolean(staleSnapshot && offers.length && result?.refreshRecommended));
  const alternativeCriteria = useMemo(() => rankAlternativeCriteria(criteria, getAlternativeProductCriteria(criteria)), [criteria]);

  useEffect(() => {
    trackEvent({ name: "product_page_viewed", productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
  }, [criteria.condition, criteria.productSlug, criteria.variantId]);

  useEffect(() => {
    if (pick) trackEvent({ name: "recommendation_viewed", productSlug: criteria.productSlug, offerId: pick.id, confidence: decision.confidence });
  }, [criteria.productSlug, decision.confidence, pick]);

  return <main id="main-content" className="nr-page pi-page">
    <ProductHeader criteria={criteria} />
    <div className="pi-content section">
      <section className="pi-product"><ListingImage offer={heroOffer} productName={product.name} fallbackLabel={product.image} large/><div className="pi-product-copy"><p className="pi-kicker">{product.brand} · {product.category}</p><h1 className="pi-title">{productPageHeading(product, variant, criteria.condition)}</h1><VariantSelectors product={product} variants={variants} criteria={criteria} selectedVariant={variant} onUpdating={() => setUpdating(true)}/><DataFreshness result={result} offerCount={offers.length} loading={loading} stale={Boolean(staleSnapshot)} refreshing={refreshingSnapshot}/><p className={`pi-updating${updating ? " is-visible" : ""}`} role="status" aria-live="polite">Updating recommendation…</p></div></section>
      {error && offers.length ? <ProductFallbackState kind="error" detail={error} alternatives={alternativeCriteria} criteria={criteria} productName={product.name} retry={retry}/> : error ? <ProductFallbackState kind="empty" detail={error} alternatives={alternativeCriteria} criteria={criteria} productName={product.name} retry={retry}/> : loading && !result ? <ProductLoadingSkeleton/> : !offers.length ? <ProductFallbackState kind={result?.lastUpdated ? "empty" : "pending"} alternatives={alternativeCriteria} criteria={criteria} productName={product.name} retry={retry}/> : <div className={`pi-results${updating ? " is-updating" : ""}`}>
        {showRefreshBanner && <p className="pi-refresh-banner" role="status" aria-live="polite"><i aria-hidden="true"/>{backgroundRefreshing ? "Checking live eBay offers now. The pick below stays until a newer validated offer is ready." : "This comparison was saved earlier. Prices can move — Kelus rechecks in the background."}</p>}
        {updating && loading && <div className="pi-updating-overlay" aria-busy="true" aria-live="polite"><ProductUpdatingOverlay/></div>}
        <DecisionReport decision={decision} lowest={lowest}/>
        <TimingAndTrack context={context} observations={exactRealPriceObservations(storedObservations, { variantId: criteria.variantId ?? "", condition: criteria.condition })} productName={product.name} criteria={criteria} result={result!}/>
        {otherOffers.length > 0 && <section className="pi-section"><p className="pi-label">Other offers</p><div className="pi-offer-list">{otherOffers.map((offer) => <OtherOffer key={offer.id} offer={offer} productName={product.name} fallbackLabel={product.image} stale={Boolean(staleSnapshot)}/>)}</div></section>}
        <section className="pi-method"><p className="pi-label">Methodology</p><p>Kelus uses persisted last-known-good eBay snapshots for the first render, then refreshes connected offers in the background. Recommendations only use comparable offers that pass product, variant, condition, seller, shipping, return, confidence, and anomaly checks.</p><Link className="text-link" href="/methodology">See how Kelus picks an offer <Icon name="arrow" size={14}/></Link></section>
        <p className="nr-disclosure">Live results currently cover matching eBay listings, not the entire market. Kelus may earn a commission from eligible retailer links.</p>
        {pick && <ProductMobileCTA offer={pick} />}
      </div>}
    </div>
  </main>;
}

function ProductUpdatingOverlay() {
  return <div className="pi-updating-overlay-card">
    <span className="pi-loading-block pi-loading-block--md"/>
    <span className="pi-loading-block pi-loading-block--lg"/>
    <p role="status">Updating recommendation…</p>
  </div>;
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
    <p className="pi-loading-status" role="status">Loading saved comparison…</p>
  </section>;
}

function DataFreshness({ result, offerCount, loading, stale, refreshing }: { result: OfferSearchResult | null; offerCount: number; loading: boolean; stale: boolean; refreshing: boolean }) {
  const savedSnapshot = Boolean(result?.servedFromCache || result?.snapshotState);
  const state = loading && !result ? "checking" : offerCount
    ? stale || savedSnapshot
      ? "snapshot"
      : "live"
    : "empty";
  const label = state === "checking" ? "CHECKING OFFERS" : state === "snapshot" ? "VALIDATED COMPARISON" : state === "live" ? "LIVE EBAY OFFERS" : "NO SAVED COMPARISON";
  const detail = state === "checking"
    ? "Looking for a saved or live comparison"
    : state === "snapshot"
      ? staleUpdatedLabel(result?.lastUpdated, result?.snapshotState)
      : state === "live"
        ? `${offerCount} offer${offerCount === 1 ? "" : "s"} · ${updatedLabel(result?.lastUpdated)}`
        : "Kelus has not saved validated offers for this configuration yet";
  return <p className={`pi-freshness is-${state}`} aria-busy={refreshing}>
    <span><i aria-hidden="true"/>{label}</span>
    <small>{detail}</small>
    {refreshing && offerCount > 0 && <em className="pi-refreshing-status" role="status" aria-live="polite"><i aria-hidden="true"/>Checking for newer offers</em>}
  </p>;
}

function ProductFallbackState({ kind, detail, alternatives, criteria, productName, retry }: { kind: "error" | "empty" | "pending"; detail?: string; alternatives: SearchCriteria[]; criteria: SearchCriteria; productName: string; retry: () => void }) {
  const liveAlternative = alternatives.map((alternative) => ({ alternative, preview: getCriteriaListingPreview(alternative) })).find((item) => item.preview.live);
  const copy = kind === "error"
    ? { title: "Live refresh unavailable.", body: detail || "Kelus could not reach the live offer source. Any saved comparison above is still shown when available." }
    : kind === "empty"
      ? { title: "No comparable offers right now.", body: detail || "Kelus checked this exact configuration, but no listing passed the current product, variant, condition, and trust checks." }
      : { title: "Comparison not ready yet.", body: "Kelus has not saved validated offers for this exact configuration yet. Kelus refreshes coverage on a schedule — track this setup or open a nearby configuration that already has live data." };
  return <section className="nr-state pi-fallback" aria-live="polite">
    <div className="pi-fallback-copy"><p className="pi-label">Offer status</p><h2>{copy.title}</h2><p>{copy.body}</p></div>
    {liveAlternative && <div className="pi-fallback-nearest is-primary">
      <p className="pi-label">Live comparison available</p>
      <Link href={liveAlternative.preview.href} className="pi-fallback-nearest-card pi-fallback-nearest-card--primary">
        <span><strong>{alternativeLabel(liveAlternative.alternative)}</strong><small>Validated now · From {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(liveAlternative.preview.fromPrice)}</small></span>
        <Icon name="arrow" size={16}/>
      </Link>
      <small>We opened the closest configuration Kelus already tracks for this product.</small>
    </div>}
    <div className="nr-state-actions"><button type="button" className="button button-primary" onClick={retry}>Check again</button><Link className="button button-secondary" href="/search">Edit search</Link></div>
    <PriceHistorySparkline
      compact
      points={historyPointsFromObservations(readBundledSnapshot(criteria)?.observations ?? [], criteria)}
      detail="Saved observations for this configuration, even before a live comparison is ready."
    />
    <NotifyWhenLive criteria={criteria} productName={productName} />
    {alternatives.length > 0 && <div className="pi-fallback-alternatives"><p>Try another supported configuration</p><div>{alternatives.map((alternative) => {
      const preview = getCriteriaListingPreview(alternative);
      return <Link key={`${alternative.variantId}-${alternative.condition}`} href={preview.href}>{alternativeLabel(alternative)}{preview.live && preview.fromPrice ? ` · From ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(preview.fromPrice)}` : ""} <Icon name="arrow" size={13}/></Link>;
    })}</div></div>}
    <Link className="text-link pi-fallback-method" href="/methodology">Why Kelus may reject an offer <Icon name="arrow" size={14}/></Link>
  </section>;
}

function alternativeLabel(criteria: SearchCriteria) {
  const variant = getVariantById(criteria.variantId);
  const condition = criteria.condition === "any" ? "Any condition" : titleCase(criteria.condition);
  return `${variant?.label ?? "Standard"} · ${condition}`;
}

function VariantSelectors({ product, variants, criteria, selectedVariant, onUpdating }: { product: Product; variants: ProductVariant[]; criteria: SearchCriteria; selectedVariant?: ProductVariant; onUpdating: () => void }) {
  const router = useRouter();
  const selectedLabel = selectedVariant?.label ?? "Unavailable";
  const options = getProductIntelligenceOptions(product, variants);
  function navigate(next: Partial<SearchCriteria>) {
    const nextCriteria = { ...criteria, ...next };
    try {
      sessionStorage.setItem("kelus-pi-updating", "1");
      onUpdating();
      router.push(canonicalProductPath(nextCriteria));
    } catch {
      onUpdating();
      window.location.assign(canonicalProductPath(nextCriteria));
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
  return <details className="pi-proof">
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
  const sellerName = decision.sellerName !== "Seller unavailable" ? decision.sellerName : decision.retailerName;
  const sellerHref = pick ? ebaySellerProfileUrl(pick.seller.name || sellerName) : null;
  return <section className="pi-pick pi-pick-reveal" aria-labelledby="our-pick-heading">
    <p className="pi-label" id="our-pick-heading">Our Pick</p>
    {verdict && <div className="pi-verdict pi-verdict-lead"><p className="pi-label">Kelus verdict</p><h2>{verdict.title}</h2><p>{verdict.detail}</p></div>}
    <div className="pi-pick-top">
      <div><span className="pi-total-label">Known total</span><strong className="pi-pick-price">{money(pick)}</strong>{savings !== null && savings > 0 && lowest ? <p className="pi-savings-callout">{moneyAmount(savings, lowest.currency)} more than cheapest — stronger validation evidence</p> : null}<ConfidenceBadge confidence={decision.confidence}/><Link className="pi-method-link" href="/methodology">How Kelus chose this <Icon name="arrow" size={13}/></Link></div>
      {pick && <div className="pi-pick-seller"><span className="pi-retailer-line"><span className="pi-retailer-logo"><EbayWordmark/></span>{sellerHref ? <a href={sellerHref} target="_blank" rel="noopener noreferrer">{sellerName}</a> : <b>{sellerName}</b>}</span><small>{offerMeta(pick)}</small></div>}
    </div>
    {pick && <div className="pi-primary-cta pi-primary-cta--early"><OutboundRetailerCTA offer={pick} label="View offer" ourPick/><span>Opens the live eBay listing</span></div>}
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
      <strong>{money(offer)}</strong><span><b className="pi-retailer-line"><span className="pi-retailer-logo"><EbayWordmark compact/></span><span>{ebaySellerProfileUrl(offer.seller.name || offer.retailer.name) ? <a href={ebaySellerProfileUrl(offer.seller.name || offer.retailer.name)!} target="_blank" rel="noopener noreferrer">{offer.seller.name || offer.retailer.name}</a> : (offer.seller.name || offer.retailer.name)}</span></b><small>{offerMeta(offer)}</small></span><ConfidenceBadge confidence={offer.trust?.confidence ?? "UNAVAILABLE"} compact/><Icon name="chevron" size={17}/>
    </button>
    <div className="pi-offer-reveal" id={detailId} aria-hidden={!open}><div><div className="pi-offer-detail"><ListingImage offer={offer} productName={productName} fallbackLabel={fallbackLabel}/><div><p>{offer.sourceTitle || `${productName} · ${titleCase(offer.condition)} listing`}</p><small>{offer.seller.feedbackPercentage ? `${offer.seller.feedbackPercentage}% positive · ` : ""}{updatedLabel(offer.lastUpdated)} · {stale ? "Saved eBay offer" : "Live eBay offer"}</small><span className="pi-secondary-cta"><OutboundRetailerCTA offer={offer} compact label="View offer"/></span></div></div></div></div>
  </article>;
}

function ProductMobileCTA({ offer }: { offer: Offer }) {
  return <div className="pi-mobile-cta" aria-label="Quick action">
    <div className="pi-mobile-cta-copy">
      <span>Our Pick</span>
      <strong>{money(offer)}</strong>
    </div>
    <OutboundRetailerCTA offer={offer} label="View offer" ourPick/>
  </div>;
}

function TimingAndTrack({ context, observations, productName, criteria, result }: { context: ReturnType<typeof getPriceContext>; observations: PriceObservation[]; productName: string; criteria: SearchCriteria; result: OfferSearchResult }) {
  const points = historyPointsFromObservations(observations, criteria);
  const average = context.average90Day ?? context.average30Day;
  const decision = getBuyWaitDecision(context);
  const building = decision.label === "HISTORY BUILDING";
  const progress = Math.min(100, Math.round((context.observationCount / minimum30DaySamples) * 100));
  const stat = (value: number | null) => value ? `$${value}` : "—";
  const track = <div className="pi-track-card"><div className="pi-track"><div><p className="pi-label">Track price</p><p>{building ? "Kelus will watch this exact configuration and email you when a target is reached." : "Keep this exact configuration connected to future real price observations."}</p></div><WatchButton product={productName} criteria={criteria} result={result}/></div></div>;

  if (building && context.observationCount === 0) {
    return <section className="pi-section pi-context pi-context-track-only">{track}</section>;
  }

  return <section className="pi-section pi-context">
    <div>
      <p className="pi-label">When to Buy</p>
      <h2>{building ? "Building price history" : decision.label}</h2>
      <p>{decision.explanation}</p>
      {building && context.observationCount > 0 ? <div className="pi-history-progress" role="status" aria-live="polite"><div className="pi-history-progress-track"><span style={{ width: `${Math.max(progress, 12)}%` }} /></div><em>{context.observationCount} of {minimum30DaySamples} observations logged toward buy/wait guidance</em></div> : null}
      {!building ? <div className="nr-context-stats"><span>Current<strong>{stat(context.currentTrustedPrice)}</strong></span><span>Typical<strong>{stat(average)}</strong></span><span>Recent low<strong>{stat(context.recentLow)}</strong></span></div> : null}
    </div>
    <PriceHistorySparkline points={points} detail={points.length >= 2 ? `Based on ${context.observationCount} real observations for this configuration.` : undefined} />
    {track}
  </section>;
}
