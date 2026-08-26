"use client";

import { useEffect } from "react";
import { SafeLink as Link } from "@/components/SafeLink";
import { canonicalProductPath, defaultSearch } from "@/lib/search-state";

const destination = canonicalProductPath(defaultSearch);

export default function LegacyProductPage() {
  useEffect(() => { window.location.replace(destination); }, []);
  return <main className="nr-page"><div className="nr-state"><p>Opening the current iPhone 17 comparison…</p><Link href={destination}>Continue to product page</Link></div></main>;
}
