import type { Concept, ConceptRelationship } from "./types";

export function prerequisitesFor(conceptId: string, relationships: ConceptRelationship[]) {
  return relationships
    .filter((relationship) => relationship.kind === "prerequisite" && relationship.toId === conceptId)
    .map((relationship) => relationship.fromId);
}

export function dependentsFor(conceptId: string, relationships: ConceptRelationship[]) {
  return relationships
    .filter((relationship) => relationship.kind === "prerequisite" && relationship.fromId === conceptId)
    .map((relationship) => relationship.toId);
}

export function prerequisiteGap(
  conceptId: string,
  concepts: Concept[],
  relationships: ConceptRelationship[],
) {
  const prerequisiteIds = prerequisitesFor(conceptId, relationships);
  if (!prerequisiteIds.length) return 0;
  const prerequisites = prerequisiteIds
    .map((id) => concepts.find((concept) => concept.id === id))
    .filter((concept): concept is Concept => Boolean(concept));
  if (!prerequisites.length) return 0;
  return prerequisites.reduce((sum, concept) => sum + (1 - concept.mastery), 0) / prerequisites.length;
}
