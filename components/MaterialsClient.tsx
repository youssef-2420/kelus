"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { useLearner } from "@/components/LearnerProvider";

/** First-run materials stay here; after diagnosis the product lives on /today. */
export function MaterialsClient() {
  const router = useRouter();
  const { state } = useLearner();
  const studyReady = state.onboardingCompleted && state.diagnosisCompleted && state.snapshot.concepts.length > 0;

  useEffect(() => {
    if (studyReady) router.replace("/today?section=materials");
  }, [studyReady, router]);

  if (studyReady) {
    return (
      <main id="main" className="destination-page">
        <p className="destination-brand">Kelus</p>
        <h1 className="destination-page-title">Opening Materials…</h1>
      </main>
    );
  }

  return <MaterialLibrary />;
}
