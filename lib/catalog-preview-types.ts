import type { ConditionFilter, SearchCriteria } from "../types/kelus.ts";

export type CriteriaListingPreview = {
  href: string;
  fromPrice: number;
  live: boolean;
  offerCount: number;
};

export type AlternativeCriteriaPreview = {
  criteria: SearchCriteria;
  preview: CriteriaListingPreview;
};

export type BundledShowcase = {
  productSlug: string;
  productName: string;
  brand: string;
  variantId: string;
  variantLabel: string;
  condition: ConditionFilter;
  href: string;
  fromPrice: number;
  pickPrice?: number;
  offerCount: number;
  lastUpdated?: string;
  listingImageUrl?: string;
};

export type ProductListingPreview = {
  productSlug: string;
  productName: string;
  brand: string;
  category: string;
  image: string;
  href: string;
  variantLabel: string;
  condition: ConditionFilter;
  fromPrice: number;
  pickPrice?: number;
  offerCount: number;
  live: boolean;
  lastUpdated?: string;
  listingImageUrl?: string;
};
