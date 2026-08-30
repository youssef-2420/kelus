"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { getProductBySlug, getVariantsForProduct, resolveProductSearch, searchProducts, suggestSupportedProducts } from "@/lib/demo-data";
import { getSearchAttributeVariants, getVisibleSearchAttributeLabel, isValidSearchConfiguration, resolveSearchAttributeVariantId, resolveSearchAttributeVariantIdFromQuery } from "@/lib/product-attributes";
import { canonicalProductPath, defaultSearch, resolveConditionFromQuery, searchCriteriaToQuery, validateSearchCriteria } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import type { ConditionFilter, Product, SearchCriteria } from "@/types/kelus";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";

type Props = { compact?: boolean; minimal?: boolean; minimalAction?: boolean; deferProductSelection?: boolean; initialCriteria?: SearchCriteria; resultPath?: string; actionLabel?: string };
const conditionLabels: Record<ConditionFilter, string> = { any: "Any", new: "New", used: "Used", refurbished: "Refurbished" };

export function SearchControls({ compact = false, minimal = false, minimalAction = false, deferProductSelection = false, initialCriteria = defaultSearch, resultPath, actionLabel = "Search" }: Props) {
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
  const [searchIssue, setSearchIssue] = useState<{ kind: "unsupported" | "ambiguous" | "invalid"; query: string; candidates?: Product[] } | null>(null);
  const matches = useMemo(() => query.trim() ? searchProducts(query) : [], [query]);
  const visibleMatches = matches.slice(0, 4);
  const variants = useMemo(() => getSearchAttributeVariants(selectedProduct, getVariantsForProduct(selectedProduct.id)), [selectedProduct]);
  const attributeLabel = getVisibleSearchAttributeLabel(selectedProduct, variants, productSelected);

  useEffect(() => {
    const resetTransition = () => document.documentElement.classList.remove("is-search-leaving");
    resetTransition();
    window.addEventListener("pageshow", resetTransition);
    return () => window.removeEventListener("pageshow", resetTransition);
  }, []);

  function chooseProduct(product: typeof selectedProduct) { const productVariants = getVariantsForProduct(product.id); setSelectedProduct(product); setProductSelected(true); setVariantId(resolveSearchAttributeVariantId(product, productVariants) ?? ""); setQuery(product.name); setSearchIssue(null); setOpen(false); setActiveIndex(-1); trackEvent({ name: "product_selected", productSlug: product.slug }); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, visibleMatches.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && activeIndex >= 0 && visibleMatches[activeIndex]) { event.preventDefault(); chooseProduct(visibleMatches[activeIndex]); }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }
  function submit() {
    if (searching) return;
    const resolution = productSelected ? null : resolveProductSearch(query);
    const submittedProduct = productSelected ? selectedProduct : resolution?.status === "resolved" ? resolution.product : undefined;
    if (!submittedProduct) {
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
      const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      setSearchIssue({ kind: "invalid", query: normalized });
      trackEvent({ name: "search_unsupported", query: normalized });
      return;
    }
    const resolvedCondition = productSelected ? condition : resolveConditionFromQuery(query, condition);
    const criteria = validateSearchCriteria({ productSlug: submittedProduct.slug, variantId: submittedVariantId || undefined, condition: resolvedCondition, market });
    if (!criteria) return;
    setOpen(false);
    flushSync(() => setSearching(true));
    document.documentElement.classList.add("is-search-leaving");
    trackEvent({ name: "search_submitted", productSlug: criteria.productSlug, query });
    trackEvent({ name: "product_resolved", productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
    window.location.assign(resultPath ? `${resultPath}?${searchCriteriaToQuery(criteria)}` : canonicalProductPath(criteria));
  }
  const issuePanel = searchIssue && <div className="unsupported-search" role="status"><strong>{searchIssue.kind === "ambiguous" ? `Choose a specific product for “${searchIssue.query}”.` : searchIssue.kind === "invalid" ? `That configuration is not available for “${searchIssue.query}”.` : `Kelus does not support “${searchIssue.query}” yet.`}</strong><span>Kelus currently compares selected phones, computers, tablets, audio products, wearables, and consoles.</span>{Boolean(searchIssue.candidates?.length) && <div><small>{searchIssue.kind === "ambiguous" ? "Did you mean:" : "Related supported products:"}</small>{searchIssue.candidates!.map((product) => <button type="button" key={product.slug} onMouseDown={() => chooseProduct(product)}>{product.name}</button>)}</div>}</div>;
  if (minimal) return <div className="rp-search-pill-wrap"><form className={`rp-search-pill${minimalAction ? " has-action" : ""}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} role="search" aria-busy={searching}><Icon name="search" size={19}/><input value={query} placeholder="Search for a product" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setProductSelected(false); setSearchIssue(null); setVariantId(""); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} />{minimalAction ? <button type="submit" className="nr-search-action" disabled={searching}>{searching ? "Finding offers…" : actionLabel}</button> : <button type="submit" className="sr-only" disabled={searching}>Search</button>}</form>{open && <div className="suggestions rp-search-suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding products…</p> : matches.length ? <>{visibleMatches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} id={`${listboxId}-${index}`} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span className="suggestion-copy"><b>{product.name}</b><small>{product.brand} · {product.category}</small></span><Icon name="arrow" size={16}/></button>)}<button type="button" className="suggestions-footer" onMouseDown={() => { void submit(); }}>View all results for “{query}” <Icon name="arrow" size={16}/></button></> : <p className="suggestion-state">No supported match yet. Press Search to record this request.</p>}</div>}{issuePanel}</div>;
  return <><form className={`${compact ? "search-controls compact" : "search-controls"}${attributeLabel ? " has-attribute" : " no-attribute"}${searching ? " is-searching" : ""}`} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={searching}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input value={query} placeholder="Search for a product" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => { setOpen(true); setActiveIndex(-1); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setProductSelected(false); setSearchIssue(null); setVariantId(""); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} /></div>
      {open && <div className="suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding products…</p> : matches.length ? <><p className="suggestions-heading">Suggested products</p>{visibleMatches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} id={`${listboxId}-${index}`} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span className="suggestion-copy"><b>{product.name}</b><small>{product.brand} · {product.category}</small></span><Icon name="arrow" size={16}/></button>)}<button type="submit" className="suggestions-footer">View all results for “{query}” <Icon name="arrow" size={16}/></button></> : <p className="suggestion-state">Kelus does not support this product yet.</p>}</div>}
      {issuePanel}
    </label>
    {attributeLabel && <label className="search-field variant-field"><span>{attributeLabel}</span><div className="select-control"><select value={variantId} onChange={(event) => setVariantId(event.target.value)} aria-label={attributeLabel}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select><Icon name="chevron" size={17}/></div></label>}
    <label className="search-field"><span>Condition</span><div className="select-control"><select value={condition} onChange={(event) => setCondition(event.target.value as ConditionFilter)} aria-label="Condition">{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <button className="button button-primary search-submit" type="submit" disabled={searching}>{searching ? "Finding offers…" : actionLabel}<Icon name={searching ? "search" : "arrow"} size={19}/></button>
  </form></>;
}
