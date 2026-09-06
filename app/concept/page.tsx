"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AppShell } from "@/components/AppShell";

function LegacyConceptRedirect() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get("id");

  useEffect(() => {
    router.replace(id ? `/concepts/${encodeURIComponent(id)}` : "/map");
  }, [id, router]);

  return <AppShell><p>Opening the knowledge map…</p></AppShell>;
}

export default function ConceptQueryPage() {
  return <Suspense fallback={<AppShell><p>Opening the knowledge map…</p></AppShell>}><LegacyConceptRedirect /></Suspense>;
}
