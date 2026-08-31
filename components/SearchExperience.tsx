"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import { SafeLink as Link } from "@/components/SafeLink";
import { getDiscoverableProducts, getProductsByCategory, getVariantsForProduct, productCategories, resolveProductSearch, searchProducts } from "@/lib/demo-data";
import type { Product } from "@/types/kelus";
import { getRelevantAttributeLabel, getSearchAttributeVariants, isValidSearchConfiguration, resolveSearchAttributeVariantId, resolveSearchAttributeVariantIdFromQuery } from "@/lib/product-attributes";
import { canonicalProductPath, defaultSearch, resolveConditionFromQuery, validateSearchCriteria } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import type { ConditionFilter } from "@/types/kelus";

const conditionOptions: Array<{ value: ConditionFilter; label: string }> = [
  { value: "any", label: "Any" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

const money = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function configurationPreview(product: Product) {
  if (product.searchAttribute.type === "none") return "Ready to compare";
  const variants = getSearchAttributeVariants(product, getVariantsForProduct(product.id));
  return variants.slice(0, 3).map((variant) => variant.label).join(" · ");
}

function ProductSuggestion({ product, index, listboxId, active, highlightPrimary, onChoose }: { product: Product; index: number; listboxId: string; active: boolean; highlightPrimary: boolean; onChoose: (product: Product) => void }) {
  return <button type="button" role="option" aria-selected={active} id={`${listboxId}-${index}`} className={`search-suggestion${active ? " is-active" : ""}${highlightPrimary && index === 0 ? " is-primary" : ""}`} onMouseDown={() => onChoose(product)}>
    <ProductMark label={product.image} small/>
    <span className="search-suggestion-copy">
      {highlightPrimary && index === 0 && <em>Closest match</em>}
      <b>{product.name}</b>
      <small>{product.brand} · {product.category}</small>
      <small className="search-suggestion-options">{configurationPreview(product)}</small>
    </span>
    <Icon name="arrow" size={16}/>
  </button>;
}

export function SearchExperience() {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState("");
  const [condition, setCondition] = useState<ConditionFilter>(defaultSearch.condition);
  const [category, setCategory] = useState<"All" | (typeof productCategories)[number]>("All");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [issue, setIssue] = useState<{ kind: "unsupported" | "ambiguous"; query: string; candidates: Product[] } | null>(null);

  const trimmedQuery = query.trim();
  const matches = useMemo(() => trimmedQuery ? searchProducts(query) : [], [query, trimmedQuery]);
  const browseProducts = useMemo(() => getProductsByCategory(category), [category]);
  const featuredProducts = useMemo(() => getDiscoverableProducts(8), []);
  const suggestionProducts = trimmedQuery ? matches : featuredProducts;
  const showSearchResults = Boolean(trimmedQuery);
  const variants = useMemo(() => selectedProduct ? getSearchAttributeVariants(selectedProduct, getVariantsForProduct(selectedProduct.id)) : [], [selectedProduct]);
  const attributeLabel = selectedProduct ? getRelevantAttributeLabel(selectedProduct, variants) : null;

  useEffect(() => {
    const resetTransition = () => document.documentElement.classList.remove("is-search-leaving");
    resetTransition();
    window.addEventListener("pageshow", resetTransition);
    inputRef.current?.focus();
    return () => window.removeEventListener("pageshow", resetTransition);
  }, []);

  function chooseProduct(product: Product) {
    const productVariants = getVariantsForProduct(product.id);
    setSelectedProduct(product);
    setVariantId(resolveSearchAttributeVariantId(product, productVariants) ?? "");
    setQuery(product.name);
    setIssue(null);
    setOpen(false);
    setActiveIndex(-1);
    trackEvent({ name: "product_selected", productSlug: product.slug });
  }

  function clearSelection() {
    setSelectedProduct(null);
    setVariantId("");
    setQuery("");
    setIssue(null);
    setOpen(true);
    queueMicrotask(() => inputRef.current?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestionProducts.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && suggestionProducts[activeIndex]) {
        event.preventDefault();
        chooseProduct(suggestionProducts[activeIndex]);
        return;
      }
      if (trimmedQuery && !selectedProduct) {
        const resolution = resolveProductSearch(query);
        if (resolution.status === "resolved") {
          event.preventDefault();
          chooseProduct(resolution.product);
        }
      }
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (searching) return;
    setIssue(null);
    const resolution = selectedProduct ? null : resolveProductSearch(query);
    const submittedProduct = selectedProduct ?? (resolution?.status === "resolved" ? resolution.product : undefined);
    if (!submittedProduct) {
      const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!normalized) return;
      setIssue({
        kind: resolution?.status === "ambiguous" ? "ambiguous" : "unsupported",
        query: normalized,
        candidates: resolution?.status === "ambiguous" ? resolution.candidates.slice(0, 6) : matches.slice(0, 6),
      });
      trackEvent({ name: "search_unsupported", query: normalized });
      return;
    }
    const submittedVariants = getVariantsForProduct(submittedProduct.id);
    const submittedVariantId = resolveSearchAttributeVariantIdFromQuery(submittedProduct, submittedVariants, query, selectedProduct ? variantId : undefined);
    if (!isValidSearchConfiguration(submittedProduct, submittedVariants, submittedVariantId)) {
      const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      setIssue({ kind: "unsupported", query: normalized, candidates: matches.slice(0, 6) });
      trackEvent({ name: "search_unsupported", query: normalized });
      return;
    }
    const resolvedCondition = selectedProduct ? condition : resolveConditionFromQuery(query, condition);
    const criteria = validateSearchCriteria({ productSlug: submittedProduct.slug, variantId: submittedVariantId || undefined, condition: resolvedCondition, market: "us" });
    if (!criteria) return;
    setOpen(false);
    flushSync(() => setSearching(true));
    document.documentElement.classList.add("is-search-leaving");
    trackEvent({ name: "search_submitted", productSlug: criteria.productSlug, query });
    trackEvent({ name: "product_resolved", productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
    window.location.assign(canonicalProductPath(criteria));
  }

  const showBrowse = !trimmedQuery && !selectedProduct;

  return <div className="search-experience">
    <header className="search-experience-header">
      <Link href="/" className="search-experience-logo" aria-label="Kelus home">kelus</Link>
      <p className="search-experience-tagline">Find the offer worth buying</p>
    </header>

    <section className="search-experience-panel" aria-label="Product search">
      <form className={`search-experience-form${searching ? " is-searching" : ""}`} onSubmit={submit} role="search" aria-busy={searching}>
        <div className="search-experience-input-wrap">
          <Icon name="search" size={20}/>
          <input
            ref={inputRef}
            value={query}
            placeholder="Search phones, laptops, tablets, audio, consoles…"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            onChange={(event) => {
              setSelectedProduct(null);
              setVariantId("");
              setIssue(null);
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
          />
          {query && <button type="button" className="search-experience-clear" onClick={clearSelection} aria-label="Clear search"><Icon name="close" size={16}/></button>}
        </div>

        {open && suggestionProducts.length > 0 && <div className="search-experience-suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">
          <p className="search-experience-suggestions-heading">{showSearchResults ? "Matches" : "Popular right now"}</p>
          {suggestionProducts.map((product, index) => <ProductSuggestion key={product.slug} product={product} index={index} listboxId={listboxId} active={index === activeIndex} highlightPrimary={showSearchResults} onChoose={chooseProduct}/>)}
          {showSearchResults && <button type="submit" className="search-experience-suggestions-footer">Compare offers for “{query}” <Icon name="arrow" size={16}/></button>}
        </div>}

        {selectedProduct && <div className="search-experience-config" aria-label="Product configuration">
          <div className="search-experience-selected">
            <ProductMark label={selectedProduct.image} small/>
            <span><b>{selectedProduct.name}</b><small>{selectedProduct.brand} · {selectedProduct.category}</small></span>
            <button type="button" onClick={clearSelection}>Change</button>
          </div>
          {attributeLabel && variants.length > 1 && <div className="search-experience-chips" role="group" aria-label={attributeLabel}>
            <span>{attributeLabel}</span>
            <div>{variants.map((variant) => <button key={variant.id} type="button" className={variant.id === variantId ? "is-active" : ""} onClick={() => setVariantId(variant.id)}>{variant.label}</button>)}</div>
          </div>}
          <div className="search-experience-chips" role="group" aria-label="Condition">
            <span>Condition</span>
            <div>{conditionOptions.map((option) => <button key={option.value} type="button" className={option.value === condition ? "is-active" : ""} onClick={() => setCondition(option.value)}>{option.label}</button>)}</div>
          </div>
        </div>}

        <button type="submit" className="button button-primary search-experience-submit" disabled={searching || !trimmedQuery}>
          {searching ? "Opening comparison…" : selectedProduct ? "Compare live offers" : "Search Kelus"}
          <Icon name={searching ? "search" : "arrow"} size={18}/>
        </button>
      </form>

      {issue && <div className="search-experience-issue" role="status">
        <strong>{issue.kind === "ambiguous" ? `Pick the exact product for “${issue.query}”.` : `Kelus does not support “${issue.query}” yet.`}</strong>
        {issue.candidates.length > 0 && <div className="search-experience-issue-grid">{issue.candidates.map((product) => <button type="button" key={product.slug} onClick={() => chooseProduct(product)}><ProductMark label={product.image} small/><span><b>{product.name}</b><small>{product.brand}</small></span></button>)}</div>}
      </div>}
    </section>

    {showBrowse && <section className="search-experience-browse" aria-label="Browse supported products">
      <div className="search-experience-categories" role="tablist" aria-label="Product categories">
        {(["All", ...productCategories] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item === "All" ? "All products" : item === "Smartphone" ? "Phones" : item === "Wearable" ? "Wearables" : `${item}s`}</button>)}
      </div>
      <div className="search-experience-grid">
        {browseProducts.map((product) => <button type="button" key={product.id} className="search-product-card" onClick={() => chooseProduct(product)}>
          <ProductMark label={product.image} small/>
          <span className="search-product-card-copy">
            <b>{product.name}</b>
            <small>{product.brand} · {product.category}</small>
            <em>{product.searchPreview?.fromPrice ? `From ${money(product.searchPreview.fromPrice)}` : configurationPreview(product)}</em>
          </span>
          <Icon name="arrow" size={16}/>
        </button>)}
      </div>
    </section>}

    <p className="search-experience-note"><Icon name="lock" size={15}/>Kelus compares exact configuration, known shipping, seller evidence, and price anomalies before recommending an offer.</p>
  </div>;
}
