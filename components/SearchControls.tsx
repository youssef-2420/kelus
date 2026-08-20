"use client";

import { useMemo, useState } from "react";
import { conditionOptions, products } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";

type Props = { compact?: boolean; defaultProduct?: string };

export function SearchControls({ compact = false, defaultProduct = "" }: Props) {
  const [query, setQuery] = useState(defaultProduct);
  const [condition, setCondition] = useState("New & Used");
  const [variant, setVariant] = useState("Any variant");
  const [location, setLocation] = useState("United States");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())).slice(0, 4), [query]);
  function submit() { window.location.assign("/results?product=" + encodeURIComponent(query || "iPhone 17") + "&location=" + encodeURIComponent(location)); }
  return <form className={compact ? "search-controls compact" : "search-controls"} onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label className="search-field product-field"><span>Product</span><div><Icon name="search" size={20}/><input value={query} placeholder="Search for a product" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} /></div>
      {open && results.length > 0 && <div className="suggestions">{results.map((product) => <button type="button" key={product.slug} onMouseDown={() => { setQuery(product.name); setOpen(false); }}><ProductMark label={product.image} small/><span><b>{product.name}</b><em>{product.brand} · {product.category}</em></span></button>)}</div>}
    </label>
    <label className="search-field"><span>Condition</span><div className="select-control"><select value={condition} onChange={(event) => setCondition(event.target.value)}><option>New & Used</option>{conditionOptions.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={17}/></div></label>
    <label className="search-field variant-field"><span>Variant</span><div className="select-control"><select value={variant} onChange={(event) => setVariant(event.target.value)}><option>Any variant</option><option>128GB</option><option>256GB</option><option>512GB</option></select><Icon name="chevron" size={17}/></div></label>
    <label className="search-field location-field"><span>Location</span><div className="select-control location-control"><Icon name="pin" size={19}/><select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Location"><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>France</option><option>Germany</option></select><Icon name="chevron" size={17}/></div></label>
    <button className="button button-primary search-submit" type="submit">{compact ? "Search" : "Compare prices"}<Icon name="arrow" size={19}/></button>
  </form>;
}
