"use client";

import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import type { ConditionFilter } from "@/types/kelus";

export const KELUS_PREFILL_SEARCH = "kelus:prefill-search";

export type PrefillSearchDetail = {
  productSlug: string;
  variantId?: string;
  condition?: ConditionFilter;
};

type Props = {
  productSlug: string;
  variantId: string;
  condition: ConditionFilter;
  href: string;
};

export function DeskPickActions({ productSlug, variantId, condition, href }: Props) {
  function searchThisSetup() {
    const detail: PrefillSearchDetail = { productSlug, variantId, condition };
    window.dispatchEvent(new CustomEvent(KELUS_PREFILL_SEARCH, { detail }));
    document.getElementById("product-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="desk-pick-actions">
      <button type="button" className="button button-primary desk-pick-cta" onClick={searchThisSetup}>
        Search this setup <Icon name="arrow" size={17} />
      </button>
      <Link className="desk-pick-secondary" href={href}>
        View full comparison <Icon name="arrow" size={15} />
      </Link>
    </div>
  );
}
