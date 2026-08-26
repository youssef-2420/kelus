"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { canonicalProductPath, readSearchCriteria } from "@/lib/search-state";

export default function LegacyResultsPage() {
  return <Suspense fallback={<RedirectState/>}><LegacyResultsRedirect/></Suspense>;
}

function LegacyResultsRedirect() {
  const params = useSearchParams();
  const criteria = useMemo(() => readSearchCriteria(new URLSearchParams(params.toString())), [params]);
  useEffect(() => { window.location.replace(canonicalProductPath(criteria)); }, [criteria]);
  return <RedirectState/>;
}

function RedirectState() {
  return <main className="nr-page"><div className="nr-state">Preparing your comparison…</div></main>;
}
