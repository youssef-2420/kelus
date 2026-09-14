import type { Concept, LearningEvent, Prompt } from "./types";

export type ReadinessLabel = "Not started" | "Needs work" | "Getting there" | "Exam-ready";
export const MASTERY_DECAY = 0.85;
export const PRIOR_WEIGHT = 2;
export interface TopicEvidence {
  conceptId: string;
  mastery: number | null;
  coverage: number;
  attemptedQuestions: number;
  availableQuestions: number;
  attemptCount: number;
  practiceDays: number;
  readinessLabel: ReadinessLabel;
  reasons: string[];
}

/** Product heuristics, not a calibrated probability of passing an exam. */
export function readinessLabel(e: Omit<TopicEvidence, "readinessLabel" | "reasons" | "conceptId">, reviewDue = false): ReadinessLabel {
  if (!e.attemptCount || e.mastery === null) return "Not started";
  if (e.mastery < 0.6) return "Needs work";
  if (e.mastery >= 0.8 && e.coverage >= 0.8 && e.attemptCount >= 5 && e.attemptedQuestions >= 3 && e.practiceDays >= 2 && !reviewDue) return "Exam-ready";
  return "Getting there";
}

/** Derived only from current question identities. No writes, clock access or network. */
export function topicEvidence(concept: Concept, prompts: Prompt[], events: LearningEvent[], nowIso: string): TopicEvidence {
  const bank = new Set(prompts.filter(p => p.conceptId === concept.id).map(p => p.id));
  const seen = new Set<string>();
  const attempts = events.filter(e => {
    if (e.conceptId !== concept.id || e.kind !== "retrieval" || !e.outcome || seen.has(e.id) || !Number.isFinite(Date.parse(e.createdAt))) return false;
    seen.add(e.id);
    return true;
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
  const mapped = attempts.filter(e => e.promptId && bank.has(e.promptId));
  const reviewed = new Set(mapped.map(e => e.promptId!));
  const scores = [...reviewed].map(id => {
    let sum = PRIOR_WEIGHT * 0.5;
    let weightSum = PRIOR_WEIGHT;
    mapped.filter(e => e.promptId === id).forEach((e, index) => {
      const weight = MASTERY_DECAY ** index;
      sum += weight * (e.outcome === "success" ? 1 : e.outcome === "partial" ? 0.5 : 0);
      weightSum += weight;
    });
    return sum / weightSum;
  });
  const mastery = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const coverage = bank.size ? reviewed.size / bank.size : 0;
  const practiceDays = new Set(mapped.map(e => new Date(e.createdAt).toISOString().slice(0, 10))).size;
  const reviewDue = Boolean(concept.nextReviewAt && Date.parse(concept.nextReviewAt) <= Date.parse(nowIso));
  const evidence = { conceptId: concept.id, mastery, coverage, attemptedQuestions: reviewed.size, availableQuestions: bank.size, attemptCount: mapped.length, practiceDays };
  const reasons: string[] = [];
  if (!bank.size) reasons.push("No question bank yet; course coverage is incomplete.");
  else if (bank.size < 3) reasons.push("Limited question coverage: fewer than three questions available.");
  if (attempts.length > mapped.length) reasons.push("Older unmapped attempts excluded from current question coverage and mastery.");
  if (!mapped.length) reasons.push("No completed attempts on current questions yet.");
  else {
    if (mapped.length < 5) reasons.push("Early evidence: fewer than five attempts.");
    if (coverage < 0.8) reasons.push("Review more of the question bank before judging readiness.");
    if (practiceDays < 2) reasons.push("Practice on another day to check consistency.");
    if (reviewDue) reasons.push("Review is due; check recall again.");
  }
  return { ...evidence, readinessLabel: readinessLabel(evidence, reviewDue), reasons };
}

export function courseEvidence(concepts: Concept[], prompts: Prompt[], events: LearningEvent[], nowIso: string) {
  const topics = concepts.map(c => topicEvidence(c, prompts, events, nowIso));
  let totalWeight = 0, coveredWeight = 0, masteredWeight = 0;
  concepts.forEach((c, index) => {
    const weight = Number.isFinite(c.examImportance) ? Math.max(0, c.examImportance) : 0;
    const topic = topics[index];
    totalWeight += weight;
    coveredWeight += weight * topic.coverage;
    masteredWeight += weight * topic.coverage * (topic.mastery ?? 0);
  });
  return { topics, coverage: totalWeight ? coveredWeight / totalWeight : 0, mastery: coveredWeight ? masteredWeight / coveredWeight : null, incomplete: topics.some(t => !t.availableQuestions) };
}
