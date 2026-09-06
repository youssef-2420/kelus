import type { Concept, ConceptRelationship, RetrievalOutcome, SelfRating } from "./types";

const RATING_GAP: Record<SelfRating, number> = {
  dont_know: 1,
  weak: 0.78,
  okay: 0.42,
  strong: 0.12,
};

export type DiagnosisEvidence = { conceptId: string; outcome: RetrievalOutcome };

function rankCandidate(concept: Concept, rating: SelfRating | undefined) {
  return concept.examImportance * 0.58 + RATING_GAP[rating ?? "dont_know"] * 0.32 + (1 - concept.confidence) * 0.1;
}

export function selectDiagnosisConcept(input: {
  concepts: Concept[];
  relationships: ConceptRelationship[];
  ratings: Record<string, SelfRating>;
  evidence: DiagnosisEvidence[];
  maximumChecks?: number;
}) {
  const maximumChecks = input.maximumChecks ?? 3;
  if (input.evidence.length >= maximumChecks) return null;
  const checked = new Set(input.evidence.map((item) => item.conceptId));
  const latest = input.evidence.at(-1);

  if (latest?.outcome === "failure") {
    const prerequisiteIds = input.relationships
      .filter((relationship) => relationship.kind === "prerequisite" && relationship.toId === latest.conceptId)
      .map((relationship) => relationship.fromId);
    const prerequisite = input.concepts
      .filter((concept) => prerequisiteIds.includes(concept.id) && !checked.has(concept.id))
      .sort((a, b) => rankCandidate(b, input.ratings[b.id]) - rankCandidate(a, input.ratings[a.id]))[0];
    if (prerequisite) return { concept: prerequisite, reason: "A prerequisite may explain the gap in your last answer." };
  }

  const remaining = input.concepts
    .filter((concept) => !checked.has(concept.id))
    .sort((a, b) => rankCandidate(b, input.ratings[b.id]) - rankCandidate(a, input.ratings[a.id]) || a.name.localeCompare(b.name));
  if (!remaining.length) return null;

  const successful = input.evidence.filter((item) => item.outcome === "success").length;
  const uncertainRemaining = remaining.some((concept) => ["dont_know", "weak"].includes(input.ratings[concept.id] ?? "dont_know"));
  if (input.evidence.length >= 2 && successful === input.evidence.length && !uncertainRemaining) return null;

  return {
    concept: remaining[0],
    reason: input.evidence.length
      ? "This is the highest-value concept where Kelus still needs evidence."
      : "This concept combines high exam value with the greatest current uncertainty.",
  };
}
