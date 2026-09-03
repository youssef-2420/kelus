"use client";

import { PREFILL_SEARCH_EVENT, type PrefillSearchDetail } from "@/lib/prefill-search";

type Props = PrefillSearchDetail & { productName: string };

export function SearchSetupButton({ productName, productSlug, variantId, condition }: Props) {
  function onClick() {
    window.dispatchEvent(new CustomEvent<PrefillSearchDetail>(PREFILL_SEARCH_EVENT, {
      detail: { productSlug, variantId, condition },
    }));
    document.getElementById("product-search")?.scrollIntoView({ block: "center" });
  }

  return (
    <button type="button" className="desk-search-setup" onClick={onClick}>
      Search this {productName} setup
    </button>
  );
}
