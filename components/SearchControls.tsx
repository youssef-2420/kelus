"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getDiscoverableProducts, getProductBySlug, getVariantsForProduct, productCategories, resolveProductSearch, searchProducts, suggestSupportedProducts } from "@/lib/demo-data";
import { getProductIntelligenceOptions, getSearchAttributeVariants, getVisibleSearchAttributeLabel, isValidSearchConfiguration, resolveSearchAttributeVariantId, resolveSearchAttributeVariantIdFromQuery } from "@/lib/product-attributes";
import { canonicalProductPath, defaultSearch, resolveConditionFromQuery, searchCriteriaToQuery, validateSearchCriteria } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import type { ConditionFilter, Product, SearchCriteria } from "@/types/kelus";
import { Icon } from "@/components/Icon";
import { ProductInterestCapture } from "@/components/ProductInterestCapture";

type Props = { compact?: boolean; minimal?: boolean; minimalAction?: boolean; deferProductSelection?: boolean; focusOnMount?: boolean; initialCriteria?: SearchCriteria; resultPath?: string; actionLabel?: string };
const conditionLabels: Record<ConditionFilter, string> = { any: "Any", new: "New", used: "Used", refurbished: "Refurbished" };
const exactConditions: ConditionFilter[] = ["any", "new", "refurbished", "used"];

function configurationPreview(product: Product) {
  if (product.searchAttribute.type === "none") return "No extra configuration needed";
  const variants = getSearchAttributeVariants(product, getVariantsForProduct(product.id));
  return variants.slice(0, 3).map((variant) => variant.label).join(" · ");
}

function ProductSuggestion({ product, index, listboxId, active, chooseProduct, highlightPrimary }: { product: Product; index: number; listboxId: string; active: boolean; chooseProduct: (product: Product) => void; highlightPrimary: boolean }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      id={`${listboxId}-${index}`}
      className={`${active ? "is-active " : ""}${highlightPrimary && index === 0 ? "is-primary" : ""}`.trim()}
      onClick={() => chooseProduct(product)}
    >
      <span className="suggestion-copy">
        {highlightPrimary && index === 0 && <em>Closest match</em>}
        <b>{product.name}</b>
        <small>{product.brand} · {product.category}</small>
        <small className="suggestion-options">{configurationPreview(product)}</small>
      </span>
      <Icon name="arrow" size={16}/>
    </button>
  );
}

export function SearchControls({ compact = false, minimal = false, minimalAction = false, deferProductSelection = false, focusOnMount = false, initialCriteria = defaultSearch, resultPath, actionLabel = "Search" }: Props) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialProduct = getProductBySlug(initialCriteria.productSlug) ?? getProductBySlug(defaultSearch.productSlug)!;
  const initialVariants = getVariantsForProduct(initialProduct.id);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [productSelected, setProductSelected] = useState(!deferProductSelection);
  const [query, setQuery] = useState(deferProductSelection ? "" : initialProduct.name);
  const [condition, setCondition] = useState<ConditionFilter>(initialCriteria.condition);
  const [variantId, setVariantId] = useState(resolveSearchAttributeVariantId(initialProduct, initialVariants, initialCriteria.variantId) ?? "");
  const market: SearchCriteria["market"] = initialCriteria.market ?? "us";
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchIssue, setSearchIssue] = useState<{ kind: "unsupported" | "ambiguous" | "invalid"; query: string; candidates?: Product[] } | null>(null);
  const [searchHint, setSearchHint] = useState("");
  const [category, setCategory] = useState("All");
  const [configOpen, setConfigOpen] = useState(false);
  const trimmedQuery = query.trim();
  const allMatches = useMemo(() => trimmedQuery ? searchProducts(query) : [], [query, trimmedQuery]);
  const matches = useMemo(() => allMatches.filter((product) => category === "All" || product.category === category), [allMatches, category]);
  const featuredMatches = useMemo(() => deferProductSelection && !trimmedQuery ? getDiscoverableProducts(50).filter((product) => category === "All" || product.category === category).slice(0, 6) : [], [category, deferProductSelection, trimmedQuery]);
  const categoryFallback = Boolean(trimmedQuery && category !== "All" && matches.length === 0 && allMatches.length > 0);
  const suggestionProducts = trimmedQuery ? (matches.length ? matches : allMatches).slice(0, 6) : featuredMatches;
  const showSearchResults = Boolean(trimmedQuery);
  const showCondition = !deferProductSelection || productSelected;
  const variants = useMemo(() => getSearchAttributeVariants(selectedProduct, getVariantsForProduct(selectedProduct.id)), [selectedProduct]);
  const attributeLabel = getVisibleSearchAttributeLabel(selectedProduct, variants, productSelected);
  const intelligenceOptions = useMemo(() => getProductIntelligenceOptions(selectedProduct, getVariantsForProduct(selectedProduct.id)), [selectedProduct]);
  const selectedVariant = variants.find((variant) => variant.id === variantId);

  useEffect(() => {
    const resetTransition = () => document.documentElement.classList.remove("is-search-leaving");
    resetTransition();
    window.addEventListener("pageshow", resetTransition);
    return () => window.removeEventListener("pageshow", resetTransition);
  }, []);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  const overlayActive = minimal && (open || (productSelected && deferProductSelection && configOpen));

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    if (overlayActive) root.classList.add("is-search-focus");
    else root.classList.remove("is-search-focus");
    return () => root.classList.remove("is-search-focus");
  }, [overlayActive]);

  useEffect(() => {
    if (!overlayActive || typeof window === "undefined") return undefined;
    const narrow = window.matchMedia("(max-width: 620px)");
    if (!narrow.matches) return undefined;
    const { body, documentElement } = document;
    const previousBody = body.style.overflow;
    const previousHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousBody;
      documentElement.style.overflow = previousHtml;
    };
  }, [overlayActive]);

  useEffect(() => {
    if (!overlayActive) return undefined;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") closeOverlay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayActive]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, open]);

  function closeOverlay() {
    setOpen(false);
    setActiveIndex(-1);
    setConfigOpen(false);
    setSearchHint("");
    inputRef.current?.blur();
  }

  function chooseProduct(product: typeof selectedProduct) {
    const productVariants = getVariantsForProduct(product.id);
    setSelectedProduct(product);
    setProductSelected(true);
    setConfigOpen(true);
    setVariantId(resolveSearchAttributeVariantId(product, productVariants) ?? "");
    setQuery(product.name);
    setSearchIssue(null);
    setSearchHint("");
    setOpen(false);
    setActiveIndex(-1);
    trackEvent({ name: "product_selected", productSlug: product.slug });
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, suggestionProducts.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && suggestionProducts[activeIndex]) { event.preventDefault(); chooseProduct(suggestionProducts[activeIndex]); return; }
      if (trimmedQuery && !productSelected) {
        const resolution = resolveProductSearch(query);
        if (resolution.status === "resolved") { event.preventDefault(); chooseProduct(resolution.product); }
      }
    }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }
  function submit() {
    if (searching) return;
    if (deferProductSelection && !trimmedQuery) {
      setSearchIssue(null);
      setSearchHint("Choose a product below to compare its exact configuration.");
      setOpen(true);
      setActiveIndex(0);
      inputRef.current?.focus();
      return;
    }
    const resolution = productSelected ? null : resolveProductSearch(query);
    const submittedProduct = productSelected ? selectedProduct : resolution?.status === "resolved" ? resolution.product : undefined;
    if (!submittedProduct) {
      if (deferProductSelection && suggestionProducts.length > 0) {
        setSearchIssue(null);
        setSearchHint("Choose the exact product below so Kelus compares the right configuration.");
        setOpen(true);
        setActiveIndex(0);
        inputRef.current?.focus();
        return;
      }
      const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (normalized) {
        setSearchIssue({ kind: resolution?.status === "ambiguous" ? "ambiguous" : "unsupported", query: normalized, candidates: resolution?.status === "ambiguous" ? resolution.candidates.slice(0, 3) : suggestSupportedProducts(normalized) });
        trackEvent({ name: "search_unsupported", query: normalized });
      }
      return;
    }
    const submittedVariants = getVariantsForProduct(submittedProduct.id);
    const submittedVariantId = resolveSearchAttributeVariantIdFromQuery(submittedProduct, submittedVariants, query, productSelected ? variantId : undefined);
    if (!isValidSearchConfiguration(submittedProduct, submittedVariants, submittedVariantId)) {
      setSelectedProduct(submittedProduct);
      setProductSelected(true);
      setConfigOpen(true);
      setVariantId(resolveSearchAttributeVariantId(submittedProduct, submittedVariants) ?? "");
      setQuery(submittedProduct.name);
      setSearchIssue(null);
      setSearchHint("That exact setup is unavailable. Choose one of the supported configurations.");
      setOpen(false);
      trackEvent({ name: "search_unsupported", query: query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() });
      return;
    }
    const resolvedCondition = productSelected ? condition : resolveConditionFromQuery(query, condition);
    const criteria = validateSearchCriteria({ productSlug: submittedProduct.slug, variantId: submittedVariantId || undefined, condition: resolvedCondition, market });
    if (!criteria) {
      setSearchIssue({ kind: "invalid", query: query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), candidates: [submittedProduct] });
      return;
    }
    setOpen(false);
    flushSync(() => setSearching(true));
    document.documentElement.classList.add("is-search-leaving");
    trackEvent({ name: "search_submitted", productSlug: criteria.productSlug, query });
    trackEvent({ name: "product_resolved", productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
    const href = resultPath ? `${resultPath}?${searchCriteriaToQuery(criteria)}` : canonicalProductPath(criteria);
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => { window.location.assign(href); }, reduceMotion ? 0 : 180);
  }
  const suggestionsPanel = open && suggestionProducts.length > 0 && <div className="suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">
    <p className="suggestions-heading">{showSearchResults ? "Suggested products" : "Popular products"}</p>
    {suggestionProducts.map((product, index) => <ProductSuggestion key={product.slug} product={product} index={index} listboxId={listboxId} active={index === activeIndex} chooseProduct={chooseProduct} highlightPrimary={showSearchResults}/>)}
    {showSearchResults && <button type="submit" className="suggestions-footer">Compare offers for “{query}” <Icon name="arrow" size={16}/></button>}
  </div>;
  const issuePanel = searchIssue && <div className="unsupported-search" role="status"><strong>{searchIssue.kind === "ambiguous" ? `Choose a specific product for “${searchIssue.query}”.` : searchIssue.kind === "invalid" ? `That configuration is not available for “${searchIssue.query}”.` : `Kelus does not support “${searchIssue.query}” yet.`}</strong><span>Kelus currently compares selected phones, computers, tablets, audio products, wearables, and consoles.</span>{Boolean(searchIssue.candidates?.length) && <div><small>{searchIssue.kind === "ambiguous" ? "Did you mean:" : "Related supported products:"}</small>{searchIssue.candidates!.map((product) => <button type="button" key={product.slug} onClick={() => chooseProduct(product)}>{product.name}</button>)}</div>}{searchIssue.kind === "unsupported" || searchIssue.kind === "ambiguous" ? <ProductInterestCapture query={searchIssue.query}/> : null}</div>;
  if (minimal) return <div className={`rp-search-pill-wrap${productSelected && deferProductSelection ? " has-selected-product" : ""}${overlayActive ? " is-overlay-open" : ""}`}>
    {overlayActive && <button type="button" className="search-overlay-scrim" aria-label="Close search overlay" onClick={closeOverlay}/>}
    <form className={`rp-search-pill${minimalAction ? " has-action" : ""}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} role="search" aria-busy={searching}>
      {deferProductSelection
        ? <label className="hero-search-category"><span className="sr-only">Category</span><select aria-label="Category" value={category} onChange={(event) => { setCategory(event.target.value); setProductSelected(false); setConfigOpen(false); setVariantId(""); setSearchIssue(null); setSearchHint(""); setOpen(true); setActiveIndex(-1); inputRef.current?.focus(); }}><option value="All">All</option>{productCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select><Icon name="chevron" size={14}/></label>
        : <Icon name="search" size={19}/>}
      <input ref={inputRef} value={query} placeholder="Search iPhone, MacBook, headphones…" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} aria-label="Product search" onFocus={() => { if (productSelected && deferProductSelection) { setConfigOpen(true); setOpen(false); return; } setOpen(true); }} onBlur={(event) => { if (event.relatedTarget instanceof HTMLElement && event.currentTarget.closest(".rp-search-pill-wrap")?.contains(event.relatedTarget)) return; window.setTimeout(() => setOpen(false), 120); }} onKeyDown={onKeyDown} onChange={(event) => { setProductSelected(false); setConfigOpen(false); setSearchIssue(null); setSearchHint(""); setVariantId(""); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }} />
      {minimalAction && <button type="submit" className="nr-search-action" disabled={searching}>{searching ? "Finding…" : actionLabel}</button>}
      {!minimalAction && <button type="submit" className="sr-only" disabled={searching}>Search</button>}
    </form>
    {open && <div className="suggestions rp-search-suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{suggestionProducts.length ? <>
      <p className="suggestions-heading">{categoryFallback ? `No ${category} match — showing all categories` : showSearchResults ? "Choose the exact product" : "Popular products"}</p>
      {(searchHint || categoryFallback) && <p className="suggestions-guidance" role="status">{searchHint || `Kelus found matches outside ${category}. Pick one below or change the filter.`}</p>}
      {suggestionProducts.map((product, index) => <ProductSuggestion key={product.slug} product={product} index={index} listboxId={listboxId} active={index === activeIndex} chooseProduct={chooseProduct} highlightPrimary={showSearchResults}/>)}
      {showSearchResults && <button type="button" className="suggestions-footer" onClick={() => { void submit(); }}>Choose a product to continue <Icon name="arrow" size={16}/></button>}
    </> : trimmedQuery ? <div className="suggestion-empty" role="status"><strong>No supported match for “{query}”.</strong><span>Try a model name, or browse products Kelus can compare now.</span><button type="button" onClick={() => { setCategory("All"); setQuery(""); setSearchHint("Choose a supported product below."); setOpen(true); inputRef.current?.focus(); }}>Show supported products</button></div> : null}</div>}
    {productSelected && deferProductSelection && configOpen && <section className="hero-config-panel" aria-label={`Configure ${selectedProduct.name}`} onPointerDown={(event) => event.stopPropagation()}>
      <div className="hero-config-product"><span><small>Selected product</small><b>{selectedProduct.name}</b><em>{selectedProduct.brand} · {selectedProduct.category}</em></span><button type="button" className="hero-config-close" aria-label="Close configuration" onClick={closeOverlay}><Icon name="close" size={16}/></button></div>
      {attributeLabel && <fieldset><legend>{attributeLabel}</legend><div className="hero-config-options">{variants.map((variant) => <button type="button" key={variant.id} className={variant.id === variantId ? "is-selected" : ""} aria-pressed={variant.id === variantId} onClick={() => setVariantId(variant.id)}>{variant.label}</button>)}</div></fieldset>}
      <fieldset><legend>Condition</legend><div className="hero-config-options">{exactConditions.map((value) => <button type="button" key={value} className={condition === value ? "is-selected" : ""} aria-pressed={condition === value} onClick={() => setCondition(value)}>{conditionLabels[value]}</button>)}</div></fieldset>
      {intelligenceOptions.showsUnlockedStatus && <p className="hero-config-network"><Icon name="lock" size={15}/><span><b>Network</b> Unlocked listings only</span></p>}
      <p className={`hero-config-hint${searchHint ? " is-attention" : ""}`}>{searchHint || "Choose the exact setup, then compare matching offers."}</p>
      <div className="hero-config-confirm"><span>{[selectedVariant?.label, conditionLabels[condition], intelligenceOptions.showsUnlockedStatus ? "Unlocked" : null].filter(Boolean).join(" · ")}</span><button type="button" className="button button-primary" onClick={() => { void submit(); }} disabled={searching}>{searching ? "Opening comparison…" : "Compare offers"}<Icon name="arrow" size={17}/></button></div>
    </section>}
    {issuePanel}
  </div>;
  return <><form className={`${compact ? "search-controls compact" : "search-controls"}${attributeLabel ? " has-attribute" : " no-attribute"}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={searching}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input ref={inputRef} value={query} placeholder="Search iPhone, MacBook, headphones…" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => { setOpen(true); setActiveIndex(-1); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setProductSelected(false); setSearchIssue(null); setVariantId(""); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }} /></div>
      {suggestionsPanel}
      {open && trimmedQuery && !suggestionProducts.length && <div className="suggestions" id={listboxId} role="listbox" aria-label="Product suggestions"><p className="suggestion-state">Kelus does not support this product yet.</p></div>}
      {issuePanel}
    </label>
    {attributeLabel && <label className="search-field variant-field"><span>{attributeLabel}</span><div className="select-control"><select value={variantId} onChange={(event) => setVariantId(event.target.value)} aria-label={attributeLabel}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select><Icon name="chevron" size={17}/></div></label>}
    {showCondition && <label className="search-field"><span>Condition</span><div className="select-control"><select value={condition} onChange={(event) => setCondition(event.target.value as ConditionFilter)} aria-label="Condition">{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Icon name="chevron" size={17}/></div></label>}
    <button className="button button-primary search-submit" type="submit" disabled={searching}>{searching ? "Finding offers…" : actionLabel}<Icon name={searching ? "search" : "arrow"} size={19}/></button>
  </form></>;
}
