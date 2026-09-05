import {
  PREREQ_BOOST,
  PRIORITY_FORGETTING,
  PRIORITY_NEWNESS,
  PRIORITY_URGENCY_DIVISOR,
  PRIORITY_WEAKNESS,
  SESSION_FADING_CAP,
  SESSION_MINUTES,
  SESSION_NEW_CAP,
  SESSION_SIZE,
  SESSION_WEAK_CAP,
  UNMET_PREREQ_CUT,
  UNMET_PREREQ_MASTERY,
} from "./constants";
import { deriveStatus } from "./learner-model";
import type { Concept, ConceptRelationship, ConceptStatus, Exam } from "./types";

export type RankedConcept = {
  concept: Concept;
  status: ConceptStatus;
  priority: number;
};

export function daysUntilExam(exam: Exam, nowIso: string) {
  const ms = Date.parse(exam.examDate) - Date.parse(nowIso);
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function examUrgency(exam: Exam, nowIso: string) {
  return 1 / (1 + daysUntilExam(exam, nowIso) / PRIORITY_URGENCY_DIVISOR);
}

export function courseMastery(concepts: Concept[]) {
  if (!concepts.length) return 0;
  const weight = concepts.reduce((total, concept) => total + concept.examImportance, 0);
  if (weight <= 0) return 0;
  return concepts.reduce((total, concept) => total + concept.mastery * concept.examImportance, 0) / weight;
}

export function conceptPriority(
  concept: Concept,
  exam: Exam,
  relationships: ConceptRelationship[],
  concepts: Concept[],
  nowIso: string,
) {
  const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
  const weakness = 1 - concept.mastery;
  const forgetting = 1 - concept.predictedRetention;
  const newness = concept.retrievalAttempts === 0 ? 1 : 0;
  let priority = examUrgency(exam, nowIso)
    * concept.examImportance
    * (PRIORITY_WEAKNESS * weakness + PRIORITY_FORGETTING * forgetting + PRIORITY_NEWNESS * newness);

  const dependents = relationships.filter((rel) => rel.kind === "prerequisite" && rel.fromId === concept.id);
  if (dependents.length && (status === "weak" || status === "not_learned")) priority *= PREREQ_BOOST;

  const prereqs = relationships
    .filter((rel) => rel.kind === "prerequisite" && rel.toId === concept.id)
    .map((rel) => concepts.find((item) => item.id === rel.fromId))
    .filter((item): item is Concept => Boolean(item));
  if (prereqs.some((item) => item.mastery < UNMET_PREREQ_MASTERY)) priority *= UNMET_PREREQ_CUT;

  return priority;
}

export function rankConcepts(concepts: Concept[], exam: Exam, relationships: ConceptRelationship[], nowIso: string): RankedConcept[] {
  return concepts
    .map((concept) => ({
      concept,
      status: deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts),
      priority: conceptPriority(concept, exam, relationships, concepts, nowIso),
    }))
    .sort((a, b) => b.priority - a.priority || a.concept.name.localeCompare(b.concept.name));
}

export function attentionCount(concepts: Concept[]) {
  return concepts.filter((concept) => {
    const status = deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts);
    return status === "weak" || status === "fading" || status === "not_learned";
  }).length;
}

export function planTodaySession(concepts: Concept[], exam: Exam, relationships: ConceptRelationship[], nowIso: string) {
  const ranked = rankConcepts(concepts, exam, relationships, nowIso);
  const chosen: RankedConcept[] = [];
  const take = (status: ConceptStatus, cap: number) => {
    for (const row of ranked) {
      if (chosen.length >= SESSION_SIZE) return;
      if (chosen.filter((item) => item.status === status).length >= cap) return;
      if (row.status !== status) continue;
      if (chosen.some((item) => item.concept.id === row.concept.id)) continue;
      chosen.push(row);
    }
  };
  take("weak", SESSION_WEAK_CAP);
  take("fading", SESSION_FADING_CAP);
  take("not_learned", SESSION_NEW_CAP);
  for (const row of ranked) {
    if (chosen.length >= SESSION_SIZE) break;
    if (chosen.some((item) => item.concept.id === row.concept.id)) continue;
    chosen.push(row);
  }
  const plannedMinutes = SESSION_MINUTES;
  return {
    concepts: chosen,
    plannedMinutes,
    weak: chosen.filter((item) => item.status === "weak").length,
    fading: chosen.filter((item) => item.status === "fading").length,
    nextNew: chosen.filter((item) => item.status === "not_learned").length,
  };
}

export function activeExamForCourse(exams: Exam[], courseId: string) {
  return exams.find((exam) => exam.courseId === courseId && exam.isActive) ?? null;
}
