import { createDemoSnapshot } from "@/data/demo-seed";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptDetail } from "./ConceptDetail";

export function generateStaticParams() {
  return createDemoSnapshot(Date.parse("2026-09-03T12:00:00.000Z")).concepts.map((concept) => ({
    id: concept.id,
  }));
}

export default function ConceptPage() {
  return <Suspense fallback={<AppShell><p>Opening concept…</p></AppShell>}><ConceptDetail /></Suspense>;
}
