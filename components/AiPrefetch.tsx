"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getAiConsent, prefetchAiTopics, subscribeAiConsent } from "@/lib/ai-client";
import { getLocalAiState, subscribeLocalAi } from "@/lib/local-ai";
import type { Concept, LearningActivity, RoutePlan } from "@/domain/types";

/** Writes questions for the next few route topics while the learner is on Today, so a session opens instantly. */
export function AiPrefetch({ route, concepts, activities }: { route: RoutePlan; concepts: Concept[]; activities: LearningActivity[] }) {
  const consent = useSyncExternalStore(subscribeAiConsent, getAiConsent, () => false);
  const local = useSyncExternalStore(subscribeLocalAi, getLocalAiState, () => "unknown");
  const ids = route.allocations.map((allocation) => String(allocation.conceptId)).filter((id) => id !== "mixed-retrieval").slice(0, 3);
  const key = ids.join("|");

  useEffect(() => {
    if (!consent || local !== "available") return;
    const inputs = ids.flatMap((id) => {
      const concept = concepts.find((item) => item.id === id);
      const activity = activities.find((item) => item.conceptId === id);
      const pageText = activity?.teach?.pageText;
      if (!concept || !pageText) return [];
      return [{
        name: concept.name,
        locator: activity.sourceReferences[0]?.locator ?? "this page",
        pageText,
        otherTopics: concepts.filter((item) => item.id !== id).map((item) => item.name),
      }];
    });
    void prefetchAiTopics(inputs);
    // Only when the next topics or the switch change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, local, key]);

  return null;
}
