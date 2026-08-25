"use client";

import { KeyboardEvent, useId, useMemo, useState } from "react";
import { getProductBySlug, getVariantsForProduct, searchProducts } from "@/lib/demo-data";
import { getSearchAttributeVariants, getVisibleSearchAttributeLabel, isValidSearchConfiguration, resolveSearchAttributeVariantId } from "@/lib/product-attributes";
import { defaultSearch, searchCriteriaToQuery } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import { startSearch } from "@/services/search-session";
import type { ConditionFilter, SearchCriteria, SearchStatus } from "@/types/kelus";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import { SearchProgress } from "@/components/SearchProgress";

type Props = { compact?: boolean; minimal?: boolean; minimalAction?: boolean; deferProductSelection?: boolean; initialCriteria?: SearchCriteria; resultPath?: string; actionLabel?: string };
const conditionLabels: Record<ConditionFilter, string> = { any: "Any", new: "New", used: "Used", refurbished: "Refurbished" };

export function SearchControls({ compact = false, minimal = false, minimalAction = false, deferProductSelection = false, initialCriteria = defaultSearch, resultPath = "/results-v2", actionLabel = "Search" }: Props) {
  const listboxId = useId();
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
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchFailed, setSearchFailed] = useState(false);
  const matches = useMemo(() => query.trim() ? searchProducts(query) : [], [query]);
  const variants = useMemo(() => getSearchAttributeVariants(selectedProduct, getVariantsForProduct(selectedProduct.id)), [selectedProduct]);
  const attributeLabel = getVisibleSearchAttributeLabel(selectedProduct, variants, productSelected);

  function chooseProduct(product: typeof selectedProduct) { const productVariants = getVariantsForProduct(product.id); setSelectedProduct(product); setProductSelected(true); setVariantId(resolveSearchAttributeVariantId(product, productVariants) ?? ""); setQuery(product.name); setOpen(false); setActiveIndex(-1); trackEvent({ name: "product_selected", productSlug: product.slug }); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, matches.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) { event.preventDefault(); chooseProduct(matches[activeIndex]); }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }
  async function submit(force = false) {
    if (searching && !force) return;
    const submittedProduct = productSelected ? selectedProduct : matches[0];
    if (!submittedProduct) return;
    const submittedVariants = getVariantsForProduct(submittedProduct.id);
    const submittedVariantId = resolveSearchAttributeVariantId(submittedProduct, submittedVariants, productSelected ? variantId : undefined);
    if (!isValidSearchConfiguration(submittedProduct, submittedVariants, submittedVariantId)) return;
    const criteria: SearchCriteria = { productSlug: submittedProduct.slug, variantId: submittedVariantId || undefined, condition, market };
    const startedAt = performance.now();
    setOpen(false); setSearching(true); setSearchFailed(false); setSearchStatus("resolving_product");
    trackEvent({ name: "search_submitted", productSlug: criteria.productSlug });
    try {
      const response = await startSearch(criteria, setSearchStatus);
      const remaining = Math.max(0, 420 - (performance.now() - startedAt));
      if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      trackEvent({ name: response.failedProviders.length ? "search_partial" : "search_completed", productSlug: criteria.productSlug });
      window.location.assign(`${resultPath}?${searchCriteriaToQuery(criteria)}`);
    } catch { setSearchStatus("error"); setSearchFailed(true); trackEvent({ name: "search_failed", productSlug: criteria.productSlug }); }
  }
  if (minimal) return <div className="rp-search-pill-wrap"><form className={`rp-search-pill${minimalAction ? " has-action" : ""}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} role="search" aria-busy={searching}><Icon name="search" size={19}/><input value={query} placeholder="Search for a product" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} />{minimalAction ? <button type="submit" className="nr-search-action" disabled={searching}>{searching ? "Checking…" : actionLabel}</button> : <button type="submit" className="sr-only" disabled={searching}>Search</button>}</form>{open && <div className="suggestions rp-search-suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding products…</p> : matches.length ? <>{matches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} id={`${listboxId}-${index}`} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span className="suggestion-copy"><b>{product.name}</b><small>{product.brand} · {product.category}</small></span><Icon name="arrow" size={16}/></button>)}<button type="button" className="suggestions-footer" onMouseDown={() => { void submit(); }}>View all results for “{query}” <Icon name="arrow" size={16}/></button></> : <p className="suggestion-state">No matching products</p>}</div>}{searching && <SearchProgress criteria={{ productSlug: selectedProduct.slug, variantId: variantId || undefined, condition, market }} status={searchStatus} failed={searchFailed} onRetry={() => { setSearchFailed(false); window.setTimeout(() => { void submit(true); }, 0); }} />}</div>;
  return <><form className={`${compact ? "search-controls compact" : "search-controls"}${attributeLabel ? " has-attribute" : " no-attribute"}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={searching}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input value={query} placeholder="Search for a product" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => { setOpen(true); setActiveIndex(-1); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setProductSelected(false); setVariantId(""); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} /></div>
      {open && <div className="suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding products…</p> : matches.length ? <><p className="suggestions-heading">Suggested products</p>{matches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} id={`${listboxId}-${index}`} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span className="suggestion-copy"><b>{product.name}</b><small>{product.brand} · {product.category}</small></span><Icon name="arrow" size={16}/></button>)}<button type="submit" className="suggestions-footer">View all results for “{query}” <Icon name="arrow" size={16}/></button></> : <p className="suggestion-state">No matching products</p>}</div>}
    </label>
    {attributeLabel && <label className="search-field variant-field"><span>{attributeLabel}</span><div className="select-control"><select value={variantId} onChange={(event) => setVariantId(event.target.value)} aria-label={attributeLabel}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select><Icon name="chevron" size={17}/></div></label>}
    <label className="search-field"><span>Condition</span><div className="select-control"><select value={condition} onChange={(event) => setCondition(event.target.value as ConditionFilter)} aria-label="Condition">{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <button className="button button-primary search-submit" type="submit" disabled={searching}>{searching ? "Checking…" : actionLabel}<Icon name={searching ? "search" : "arrow"} size={19}/></button>
  </form>{searching && <SearchProgress criteria={{ productSlug: selectedProduct.slug, variantId: variantId || undefined, condition, market }} status={searchStatus} failed={searchFailed} onRetry={() => { setSearchFailed(false); window.setTimeout(() => { void submit(true); }, 0); }} />}</>;
}
