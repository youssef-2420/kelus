"use client";

import { useMemo, useState } from "react";
import { ProductListingCard } from "@/components/ProductListingCard";
import type { ProductListingPreview } from "@/lib/catalog-preview-types";

type SortMode = "price" | "name";

type Props = {
  previews: ProductListingPreview[];
  categories: string[];
};

export function ProductsDirectory({ previews, categories }: Props) {
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("price");

  const filtered = useMemo(() => {
    let items = validatedOnly ? previews.filter((preview) => preview.live) : previews;
    items = [...items].sort((left, right) => {
      if (sort === "name") return `${left.brand} ${left.productName}`.localeCompare(`${right.brand} ${right.productName}`);
      const leftPrice = left.live ? left.fromPrice : Number.POSITIVE_INFINITY;
      const rightPrice = right.live ? right.fromPrice : Number.POSITIVE_INFINITY;
      if (leftPrice !== rightPrice) return leftPrice - rightPrice;
      return `${left.brand} ${left.productName}`.localeCompare(`${right.brand} ${right.productName}`);
    });
    return items;
  }, [previews, sort, validatedOnly]);

  const liveCount = previews.filter((preview) => preview.live).length;

  return <>
    <div className="products-directory-toolbar" role="toolbar" aria-label="Filter products">
      <label className="products-directory-toggle">
        <input type="checkbox" checked={validatedOnly} onChange={(event) => setValidatedOnly(event.target.checked)} />
        <span>Validated only <em>{liveCount}</em></span>
      </label>
      <label className="products-directory-sort">
        <span>Sort by</span>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort products">
          <option value="price">Lowest price</option>
          <option value="name">Name</option>
        </select>
      </label>
      <p className="products-directory-count" aria-live="polite">{filtered.length} product{filtered.length === 1 ? "" : "s"} shown</p>
    </div>
    {categories.map((category) => {
      const items = filtered.filter((preview) => preview.category === category);
      if (!items.length) return null;
      return (
        <section key={category} className="products-directory-group" aria-label={category}>
          <h2>{category}</h2>
          <div className="products-directory-grid">
            {items.map((preview) => (
              <ProductListingCard key={preview.href} preview={preview} />
            ))}
          </div>
        </section>
      );
    })}
    {!filtered.length && <div className="products-directory-empty" role="status">
      <p>No validated products match this filter yet.</p>
      <button type="button" className="button button-secondary" onClick={() => setValidatedOnly(false)}>Show all products</button>
    </div>}
  </>;
}
