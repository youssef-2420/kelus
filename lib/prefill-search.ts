import type { ConditionFilter } from "@/types/kelus";

export const PREFILL_SEARCH_EVENT = "kelus:prefill-search";

export type PrefillSearchDetail = {
  productSlug: string;
  variantId: string;
  condition: ConditionFilter;
};
