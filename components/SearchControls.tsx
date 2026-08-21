"use client";

import { KeyboardEvent, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductBySlug, getVariantsForProduct, marketOptions, searchProducts } from "@/lib/demo-data";
import { defaultSearch, searchCriteriaToQuery } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import type { ConditionFilter, SearchCriteria } from "@/types/kelus";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";

type Props = { compact?: boolean; initialCriteria?: SearchCriteria };
const conditionLabels: Record<ConditionFilter, string> = { any: "Any", new: "New", used: "Used", refurbished: "Refurbished" };

export function SearchControls({ compact = false, initialCriteria = defaultSearch }: Props) {
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
  const matches = useMemo(() => query.trim() ? searchProducts(query) : [], [query]);
  const variants = useMemo(() => getVariantsForProduct(selectedProduct.id), [selectedProduct.id]);

  function chooseProduct(product: typeof selectedProduct) { setSelectedProduct(product); setVariantId(getVariantsForProduct(product.id)[0]?.id ?? ""); setQuery(product.name); setOpen(false); setActiveIndex(-1); trackEvent({ name: "product_selected", productSlug: product.slug }); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, matches.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) { event.preventDefault(); chooseProduct(matches[activeIndex]); }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }
  function submit() { const criteria: SearchCriteria = { productSlug: selectedProduct.slug, variantId: variantId || undefined, condition, market }; trackEvent({ name: "search_submitted", productSlug: criteria.productSlug }); router.push(`/results?${searchCriteriaToQuery(criteria)}`); }
  return <form className={compact ? "search-controls compact" : "search-controls"} onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input value={query} placeholder="Search for a product" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} onFocus={() => { setOpen(true); setActiveIndex(-1); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} onChange={(event) => { setLoading(true); setQuery(event.target.value); setOpen(true); setActiveIndex(-1); window.setTimeout(() => setLoading(false), 160); }} /></div>
      {open && <div className="suggestions" id={listboxId} role="listbox" aria-label="Product suggestions">{loading ? <p className="suggestion-state">Finding Apple products…</p> : matches.length ? matches.map((product, index) => <button type="button" role="option" aria-selected={index === activeIndex} id={`${listboxId}-${index}`} className={index === activeIndex ? "is-active" : ""} key={product.slug} onMouseDown={() => chooseProduct(product)}><ProductMark label={product.image} small/><span><b>{product.name}</b><em>{product.brand} · {product.category}</em></span></button>) : <p className="suggestion-state">No matching products</p>}</div>}
    </label>
    <label className="search-field"><span>Condition</span><div className="select-control"><select value={condition} onChange={(event) => setCondition(event.target.value as ConditionFilter)} aria-label="Condition">{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <label className="search-field variant-field"><span>Variant</span><div className="select-control"><select value={variantId} onChange={(event) => setVariantId(event.target.value)} aria-label="Variant">{variants.length ? variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>) : <option value="">No variants yet</option>}</select><Icon name="chevron" size={17}/></div></label>
    <label className="search-field location-field"><span>Location</span><div className="select-control location-control"><Icon name="pin" size={19}/><select value={market} onChange={(event) => setMarket(event.target.value as SearchCriteria["market"])} aria-label="Location">{marketOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <button className="button button-primary search-submit" type="submit">{compact ? "Search" : "Compare prices"}<Icon name="arrow" size={19}/></button>
  </form>;
}
