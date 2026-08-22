"use client";

import { KeyboardEvent, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductBySlug, getVariantsForProduct, marketOptions, searchProducts } from "@/lib/demo-data";
import { defaultSearch, searchCriteriaToQuery } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import { startSearch } from "@/services/search-session";
import type { ConditionFilter, SearchCriteria, SearchStatus } from "@/types/kelus";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import { SearchProgress } from "@/components/SearchProgress";

type Props = { compact?: boolean; minimal?: boolean; initialCriteria?: SearchCriteria };
const conditionLabels: Record<ConditionFilter, string> = { any: "Any", new: "New", used: "Used", refurbished: "Refurbished" };

export function SearchControls({ compact = false, minimal = false, initialCriteria = defaultSearch }: Props) {
  const router = useRouter();
  const listboxId = useId();
  const initialProduct = getProductBySlug(initialCriteria.productSlug) ?? getProductBySlug(defaultSearch.productSlug)!;
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [query, setQuery] = useState(initialProduct.name);
  const [condition, setCondition] = useState<ConditionFilter>(initialCriteria.condition);
  const [variantId, setVariantId] = useState(initialCriteria.variantId ?? "");
  const [market, setMarket] = useState(initialCriteria.market);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchFailed, setSearchFailed] = useState(false);
  const matches = useMemo(() => query.trim() ? searchProducts(query) : [], [query]);
  const variants = useMemo(() => getVariantsForProduct(selectedProduct.id), [selectedProduct.id]);

  function chooseProduct(product: typeof selectedProduct) { setSelectedProduct(product); setVariantId(getVariantsForProduct(product.id)[0]?.id ?? ""); setQuery(product.name); setOpen(false); setActiveIndex(-1); trackEvent({ name: "product_selected", productSlug: product.slug }); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, matches.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) { event.preventDefault(); chooseProduct(matches[activeIndex]); }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }
  async function submit(force = false) {
    if (searching && !force) return;
    const criteria: SearchCriteria = { productSlug: selectedProduct.slug, variantId: variantId || undefined, condition, market };
    const startedAt = performance.now();
    setOpen(false); setSearching(true); setSearchFailed(false); setSearchStatus("resolving_product");
    trackEvent({ name: "search_submitted", productSlug: criteria.productSlug });
    try {
      const response = await startSearch(criteria, setSearchStatus);
      const remaining = Math.max(0, 420 - (performance.now() - startedAt));
      if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      trackEvent({ name: response.failedProviders.length ? "search_partial" : "search_completed", productSlug: criteria.productSlug });
      router.push(`/results?${searchCriteriaToQuery(criteria)}`);
    } catch { setSearchStatus("error"); setSearchFailed(true); trackEvent({ name: "search_failed", productSlug: criteria.productSlug }); }
  }
  if (minimal) return <div className="rp-search-pill-wrap"><form className={`rp-search-pill${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} role="search" aria-busy={searching}><Icon name="search" size={19}/><input value={query} placeholder="Search for any product or store" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} /><button type="submit" className="sr-only" disabled={searching}>Search</button></form>{open && <div className="suggestions rp-search-suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding products…</p> : matches.length ? <>{matches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span className="suggestion-copy"><em>{product.brand}</em><b>{product.name}</b><small>{product.category}</small></span><Icon name="arrow" size={16}/></button>)}<button type="submit" className="suggestions-footer">View all results for “{query}” <Icon name="arrow" size={16}/></button></> : <p className="suggestion-state">No matching products</p>}</div>}{searching && <SearchProgress criteria={{ productSlug: selectedProduct.slug, variantId: variantId || undefined, condition, market }} status={searchStatus} failed={searchFailed} onRetry={() => { setSearchFailed(false); window.setTimeout(() => { void submit(true); }, 0); }} />}</div>;
  return <><form className={`${compact ? "search-controls compact" : "search-controls"}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={searching}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input value={query} placeholder="Search for a product" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => { setOpen(true); setActiveIndex(-1); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} /></div>
      {open && <div className="suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding Apple products…</p> : matches.length ? <><p className="suggestions-heading">Suggested products</p>{matches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} id={`${listboxId}-${index}`} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span className="suggestion-copy"><em>{product.brand}</em><b>{product.name}</b><small>{product.searchPreview ? `From $${product.searchPreview.fromPrice.toLocaleString()} · ${product.searchPreview.offerCount || "No"} demo offer${product.searchPreview.offerCount === 1 ? "" : "s"}` : product.category}</small></span><Icon name="arrow" size={16}/></button>)}<button type="submit" className="suggestions-footer">View all results for “{query}” <Icon name="arrow" size={16}/></button></> : <p className="suggestion-state">No matching products</p>}</div>}
    </label>
    <label className="search-field"><span>Condition</span><div className="select-control"><select value={condition} onChange={(event) => setCondition(event.target.value as ConditionFilter)} aria-label="Condition">{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <label className="search-field variant-field"><span>Variant</span><div className="select-control"><select value={variantId} onChange={(event) => setVariantId(event.target.value)} aria-label="Variant">{variants.length ? variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>) : <option value="">No variants yet</option>}</select><Icon name="chevron" size={17}/></div></label>
    <label className="search-field location-field"><span>Location</span><div className="select-control location-control"><Icon name="pin" size={19}/><select value={market} onChange={(event) => setMarket(event.target.value as SearchCriteria["market"])} aria-label="Location">{marketOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <button className="button button-primary search-submit" type="submit" disabled={searching}>{searching ? "Checking…" : compact ? "Search" : "Compare prices"}<Icon name={searching ? "search" : "arrow"} size={19}/></button>
  </form>{searching && <SearchProgress criteria={{ productSlug: selectedProduct.slug, variantId: variantId || undefined, condition, market }} status={searchStatus} failed={searchFailed} onRetry={() => { setSearchFailed(false); window.setTimeout(() => { void submit(true); }, 0); }} />}</>;
}
