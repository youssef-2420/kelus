import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptDetail } from "@/app/concepts/[id]/ConceptDetail";

export const metadata: Metadata = {
  title: "Concept — Kelus",
  robots: { index: false, follow: false },
};

// Uploaded concepts get device-created IDs, so their detail page must not
// depend on a build-time list of dynamic routes in the static export.
export default function ConceptQueryPage() {
  return (
    <Suspense fallback={<AppShell><p>Opening concept…</p></AppShell>}>
      <ConceptDetail />
    </Suspense>
  );
}
