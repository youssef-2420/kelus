"use client";

import { useSearchParams } from "next/navigation";
import { ConceptDetail } from "@/app/concepts/[id]/ConceptDetail";
import { useLearner } from "@/components/LearnerProvider";
import { RevisionSurface } from "@/components/RevisionSurface";

/** A topic's page lives inside the course workspace: same sidebar, top bar and tab bar as its course. */
export function ConceptRoute() {
  const id = useSearchParams().get("id");
  const { state } = useLearner();
  if (!state.onboardingCompleted || !id) return <ConceptDetail />;
  return <RevisionSurface topicId={id} />;
}
