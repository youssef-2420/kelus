"use client";

import { getProductBySlug, getVariantById } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";
import type { SearchCriteria, SearchStatus } from "@/types/kelus";

const messages: Record<SearchStatus, string> = {
  idle: "Checking the market…", resolving_product: "Finding matching offers…", fetching_offers: "Checking the market…", normalizing_offers: "Comparing prices…", ranking: "Checking seller and purchase terms…", complete: "Comparison ready", partial: "Comparison ready", error: "We could not compare prices right now.",
};

export function SearchProgress({ criteria, status, failed, onRetry }: { criteria: SearchCriteria; status: SearchStatus; failed: boolean; onRetry: () => void }) {
  const product = getProductBySlug(criteria.productSlug);
  const variant = getVariantById(criteria.variantId);
  const message = messages[failed ? "error" : status];
  return <div className="search-transition" role="status" aria-live="polite" aria-atomic="true"><div className="search-progress-card"><div className="search-progress-brand" aria-hidden="true"><span className="wordmark">kelus</span><i/><i/></div><p className="eyebrow">Comparing trusted offers</p><h2>{product?.name ?? "Your product"}{variant?.label && <span> · {variant.label}</span>}</h2><div className="search-progress-status"><Icon name={failed ? "close" : "search"} size={18}/><p>{message}</p></div>{failed && <><p className="search-progress-help">Please try again in a moment.</p><button type="button" className="button button-primary" onClick={onRetry}>Try again <Icon name="arrow" size={17}/></button></>}<span className="sr-only">{message}</span></div></div>;
}
