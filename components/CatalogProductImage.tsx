"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { ProductMark } from "@/components/ProductMark";
import { optimizedRetailerImageUrl } from "@/services/retailer-image";

type Props = {
  listingImageUrl?: string;
  fallbackLabel: string;
  className?: string;
};

export function CatalogProductImage({ listingImageUrl, fallbackLabel, className = "catalog-product-image" }: Props) {
  const [failed, setFailed] = useState(false);
  const source = optimizedRetailerImageUrl(listingImageUrl, 120);
  if (source && !failed) {
    return (
      <span className={className}>
        <img src={source} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className={`${className} is-fallback`} aria-hidden="true">
      <ProductMark label={fallbackLabel} small />
    </span>
  );
}
