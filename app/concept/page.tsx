import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptDetail } from "@/app/concepts/[id]/ConceptDetail";

export default function ConceptQueryPage() {
  return (
    <Suspense fallback={<AppShell><p>Opening concept…</p></AppShell>}>
      <ConceptDetail />
    </Suspense>
  );
}
