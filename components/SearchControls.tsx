"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { conditionOptions, products } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";

type Props = { compact?: boolean; defaultProduct?: string };

export function SearchControls({ compact = false, defaultProduct = "" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultProduct);
  const [condition, setCondition] = useState("New & Used");
  const [variant, setVariant] = useState("Any variant");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())).slice(0, 4), [query]);
  function submit() { router.push("/results?product=" + encodeURIComponent(query || "iPhone 17")); }
  return <form className={compact ? "search-controls compact" : "search-controls"} onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input value={query} placeholder="Search for a product" onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} /><Icon name="chevron" size={18}/></div>
      {open && results.length > 0 && <div className="suggestions">{results.map((product) => <button type="button" key={product.slug} onMouseDown={() => { setQuery(product.name); setOpen(false); }}><ProductMark label={product.image} small/><span><b>{product.name}</b><em>{product.brand} · {product.category}</em></span></button>)}</div>}
    </label>
    <label className="search-field"><span>Condition</span><select value={condition} onChange={(event) => setCondition(event.target.value)}><option>New & Used</option>{conditionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="search-field variant-field"><span>Variant</span><select value={variant} onChange={(event) => setVariant(event.target.value)}><option>Any variant</option><option>128GB</option><option>256GB</option><option>512GB</option></select></label>
    <div className="search-field location-field"><span>Location</span><div><Icon name="pin" size={19}/><strong>United States</strong><Icon name="chevron" size={18}/></div></div>
    <button className="button button-primary search-submit" type="submit">{compact ? "Search" : "Compare prices"}<Icon name="arrow" size={19}/></button>
  </form>;
}
