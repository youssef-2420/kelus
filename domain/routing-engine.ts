import { ROUTING } from "./constants";
import { calculateLearningValue } from "./learning-value";
import type { Concept, ConceptRelationship, Exam, LearningEvent, LearningValue, RouteAllocation, RouteChange, RoutePlan } from "./types";

export type RankedLearningAction = {
  concept: Concept;
  value: LearningValue;
};

export function rankLearningActions(input: {
  concepts: Concept[];
  relationships: ConceptRelationship[];
  events: LearningEvent[];
  exam: Exam;
  nowIso: string;
}) {
  return input.concepts
    .map((concept) => ({
      concept,
      value: calculateLearningValue({ ...input, concept }),
    }))
    .sort((a, b) => b.value.score - a.value.score || a.concept.name.localeCompare(b.concept.name));
}

function allocateMinutes(actions: RankedLearningAction[], availableMinutes: number) {
  const mixedMinutes = availableMinutes >= 30 ? ROUTING.mixedRetrievalMinutes : 0;
  const learningBudget = availableMinutes - mixedMinutes;
  const selected = actions.slice(0, ROUTING.maximumConceptStops);
  if (!selected.length) return [];
  const weights = selected.map((action) => Math.sqrt(Math.max(0.01, action.value.score)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const minutes = weights.map((weight) => Math.max(
    ROUTING.minimumConceptMinutes,
    Math.min(ROUTING.maximumConceptMinutes, Math.round(learningBudget * weight / totalWeight)),
  ));
  let difference = learningBudget - minutes.reduce((sum, minute) => sum + minute, 0);
  let cursor = 0;
  while (difference !== 0 && cursor < 100) {
    const index = cursor % minutes.length;
    if (difference > 0 && minutes[index] < ROUTING.maximumConceptMinutes) {
      minutes[index] += 1;
      difference -= 1;
    } else if (difference < 0 && minutes[index] > ROUTING.minimumConceptMinutes) {
      minutes[index] -= 1;
      difference += 1;
    }
    cursor += 1;
  }
  return minutes;
}

export function generateRoute(input: {
  concepts: Concept[];
  relationships: ConceptRelationship[];
  events: LearningEvent[];
  exam: Exam;
  nowIso: string;
  availableMinutes?: number;
}): RoutePlan {
  const availableMinutes = Math.max(
    ROUTING.minimumSessionMinutes,
    Math.min(ROUTING.maximumSessionMinutes, input.availableMinutes ?? input.exam.availableMinutes),
  );
  const ranked = rankLearningActions(input);
  const selected = ranked.slice(0, ROUTING.maximumConceptStops);
  const minutes = allocateMinutes(selected, availableMinutes);
  const allocations: RouteAllocation[] = selected.map((action, index) => ({
    conceptId: action.concept.id,
    minutes: minutes[index],
    learningValue: action.value.score,
    reasons: action.value.reasons,
  }));
  const allocated = allocations.reduce((sum, allocation) => sum + allocation.minutes, 0);
  if (availableMinutes - allocated > 0) {
    allocations.push({
      conceptId: "mixed-retrieval",
      minutes: availableMinutes - allocated,
      learningValue: 0,
      reasons: ["REVIEW_DUE"],
    });
  }
  return { generatedAt: input.nowIso, availableMinutes, allocations };
}

export function compareRoutes(previous: RoutePlan, next: RoutePlan): RouteChange {
  const oldIds = previous.allocations.map((item) => item.conceptId).filter((id) => id !== "mixed-retrieval");
  const nextIds = next.allocations.map((item) => item.conceptId).filter((id) => id !== "mixed-retrieval");
  let best: RouteChange = { meaningful: false, movedConceptId: null, previousIndex: null, nextIndex: null, explanation: null };
  for (const id of nextIds) {
    const previousIndex = oldIds.indexOf(id);
    const nextIndex = nextIds.indexOf(id);
    if (previousIndex < 0 || nextIndex < 0) continue;
    const movement = previousIndex - nextIndex;
    if (movement >= ROUTING.meaningfulMovePositions) {
      return {
        meaningful: true,
        movedConceptId: id,
        previousIndex,
        nextIndex,
        explanation: "New evidence changed the expected value of your remaining study time.",
      };
    }
    if (movement > (best.previousIndex ?? 0) - (best.nextIndex ?? 0)) {
      best = { ...best, movedConceptId: id, previousIndex, nextIndex };
    }
  }
  const oldTop = previous.allocations[0];
  const newTop = next.allocations[0];
  if (oldTop && newTop && oldTop.conceptId !== newTop.conceptId) {
    const delta = Math.abs(newTop.learningValue - oldTop.learningValue) / Math.max(oldTop.learningValue, 0.01);
    if (delta >= ROUTING.meaningfulTopScoreDelta) {
      return {
        meaningful: true,
        movedConceptId: String(newTop.conceptId),
        previousIndex: oldIds.indexOf(newTop.conceptId),
        nextIndex: 0,
        explanation: "New evidence made another concept a better use of the next minute.",
      };
    }
  }
  return best;
}
