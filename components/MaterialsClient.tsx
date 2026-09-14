"use client";

import { MaterialLibrary } from "@/components/MaterialLibrary";
import { RevisionSurface } from "@/components/RevisionSurface";
import { useLearner } from "@/components/LearnerProvider";

export function MaterialsClient() {
  const { state } = useLearner();
  if (state.onboardingCompleted && state.diagnosisCompleted && state.snapshot.concepts.length > 0) {
    return <RevisionSurface mode="materials" />;
  }
  return <MaterialLibrary />;
}
