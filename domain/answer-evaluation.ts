import type { LearningActivity, RetrievalOutcome } from "./types";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "then", "this", "to", "was", "which", "while", "with",
]);

const CANONICAL_TERMS: Record<string, string> = {
  activates: "cause", activated: "cause", activation: "cause", causes: "cause", caused: "cause", creates: "cause", triggers: "cause",
  consequence: "result", effect: "result", outcome: "result", produces: "result", resulting: "result",
  decreases: "reduce", decreased: "reduce", lowers: "reduce", reduced: "reduce",
  grows: "increase", increased: "increase", raises: "increase", rises: "increase",
  required: "condition", requirement: "condition", prerequisite: "condition",
  demonstrates: "show", indicates: "show", proves: "show", reveals: "show",
  occurs: "happen", happens: "happen",
  liable: "liability", responsible: "liability",
  computation: "calculate", computes: "calculate", calculated: "calculate",
};

function stem(token: string) {
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function normalizeToken(token: string) {
  return CANONICAL_TERMS[token] ?? CANONICAL_TERMS[stem(token)] ?? stem(token);
}

function evidenceTokens(value: string) {
  return [...new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token)).map(normalizeToken))];
}

function matchedTerms(answer: string, terms: string[]) {
  const actual = new Set(evidenceTokens(answer));
  return [...new Set(terms.map(normalizeToken))].filter((term) => actual.has(term));
}

function coverage(answer: string, expected: string) {
  const expectedTokens = evidenceTokens(expected);
  if (!expectedTokens.length) return 0;
  const actual = new Set(evidenceTokens(answer));
  return expectedTokens.filter((token) => actual.has(token)).length / expectedTokens.length;
}

function contradictionDetected(answer: string, expected: string) {
  const negation = /\b(?:not|never|no|cannot|doesn't|does not)\b/i;
  return coverage(answer, expected) >= 0.25 && negation.test(answer) && !negation.test(expected);
}

export type AnswerCriterionResult = { id: string; label: string; met: boolean; evidence: string[] };

export type AnswerEvaluation = {
  outcome: RetrievalOutcome;
  score: number;
  label: "Strong evidence" | "Partial evidence" | "Not enough evidence yet";
  explanation: string;
  matchedRetrieve: number;
  matchedApply: number;
  criteria: AnswerCriterionResult[];
  contradiction: boolean;
};

export function evaluateLearningResponse(input: {
  retrieveAnswer: string;
  applicationAnswer: string;
  retrieveModelAnswer: string;
  applicationModelAnswer: string;
  assessment?: LearningActivity["assessment"];
}): AnswerEvaluation {
  const retrieveWords = evidenceTokens(input.retrieveAnswer).length;
  const applicationWords = evidenceTokens(input.applicationAnswer).length;
  const matchedRetrieve = coverage(input.retrieveAnswer, input.retrieveModelAnswer);
  const matchedApply = coverage(input.applicationAnswer, input.applicationModelAnswer);
  const contradiction = contradictionDetected(`${input.retrieveAnswer} ${input.applicationAnswer}`, `${input.retrieveModelAnswer} ${input.applicationModelAnswer}`);
  const criteria = (input.assessment?.criteria ?? []).map((criterion) => {
    const answer = criterion.appliesTo === "retrieve" ? input.retrieveAnswer : criterion.appliesTo === "apply" ? input.applicationAnswer : `${input.retrieveAnswer} ${input.applicationAnswer}`;
    const evidence = matchedTerms(answer, criterion.terms);
    return { id: criterion.id, label: criterion.label, met: evidence.length >= criterion.minimumMatches, evidence };
  });
  const criterionRatio = criteria.length ? criteria.filter((criterion) => criterion.met).length / criteria.length : 0;
  const lexicalScore = matchedRetrieve * 0.55 + matchedApply * 0.25;
  const score = Number(Math.max(0, lexicalScore + criterionRatio * 0.2 - (contradiction ? 0.45 : 0)).toFixed(3));
  const reasoningMet = criteria.find((criterion) => criterion.id === "reasoning")?.met ?? matchedApply >= 0.2;
  const sourceMet = criteria.find((criterion) => criterion.id === "source-idea")?.met ?? matchedRetrieve >= 0.34;

  if (!contradiction && retrieveWords >= 5 && applicationWords >= 5 && sourceMet && reasoningMet && score >= 0.34) {
    return { outcome: "success", score, label: "Strong evidence", explanation: "The response preserves the source idea, explains the required reasoning, and applies it without a detected contradiction.", matchedRetrieve, matchedApply, criteria, contradiction };
  }
  if (!contradiction && retrieveWords >= 3 && applicationWords >= 3 && (sourceMet || reasoningMet || score >= 0.16)) {
    return { outcome: "partial", score, label: "Partial evidence", explanation: "Some required reasoning is present, but at least one source-backed criterion is still missing.", matchedRetrieve, matchedApply, criteria, contradiction };
  }
  return { outcome: "failure", score, label: "Not enough evidence yet", explanation: contradiction ? "The response uses relevant terms but appears to reverse or negate the source relationship." : "The responses do not yet satisfy enough of the source-backed assessment criteria to raise mastery.", matchedRetrieve, matchedApply, criteria, contradiction };
}

export function evaluateDiagnosisResponse(input: { answer: string; modelAnswer: string; assessment?: LearningActivity["assessment"] }): AnswerEvaluation {
  return evaluateLearningResponse({ retrieveAnswer: input.answer, applicationAnswer: input.answer, retrieveModelAnswer: input.modelAnswer, applicationModelAnswer: input.modelAnswer, assessment: input.assessment });
}
