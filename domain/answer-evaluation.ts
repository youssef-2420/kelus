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
  // Small, explicit paraphrase groups. They do not infer meaning from arbitrary prose.
  expensive: "cost", expense: "cost", costs: "cost",
  investing: "invest", investment: "invest", investments: "invest",
  restrains: "reduce", restrained: "reduce", fall: "reduce", falls: "reduce", ease: "reduce", eases: "reduce",
  higher: "increase",
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
  // A free-floating "not" is not evidence of a reversed claim: "not immediately"
  // can be the correct explanation of a delayed effect. Only flag an explicit
  // negation of a relation the reference actually asserts.
  if (coverage(answer, expected) < 0.25) return false;
  const relation = /\b(?:do\s+not|does\s+not|did\s+not|doesn't|don't|didn't|never)\s+(lower|reduce|increase|raise|cause|require)s?\b/gi;
  for (const match of answer.matchAll(relation)) {
    const predicate = normalizeToken(match[1].toLowerCase());
    if (evidenceTokens(expected).includes(predicate)) return true;
  }
  return false;
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
  /** A recall check asks only for the source idea. Reasoning and transfer belong to the application step. */
  retrievalOnly?: boolean;
}): AnswerEvaluation {
  const retrievalOnly = input.retrievalOnly === true;
  const retrieveWords = evidenceTokens(input.retrieveAnswer).length;
  const applicationWords = retrievalOnly ? retrieveWords : evidenceTokens(input.applicationAnswer).length;
  const matchedRetrieve = coverage(input.retrieveAnswer, input.retrieveModelAnswer);
  const matchedApply = retrievalOnly ? matchedRetrieve : coverage(input.applicationAnswer, input.applicationModelAnswer);
  const contradiction = contradictionDetected(input.retrieveAnswer, input.retrieveModelAnswer)
    || contradictionDetected(input.applicationAnswer, input.applicationModelAnswer);
  const rubric = (input.assessment?.criteria ?? []).filter((criterion) => !retrievalOnly || criterion.appliesTo !== "apply");
  const criteria = rubric.map((criterion) => {
    const answer = criterion.appliesTo === "retrieve" ? input.retrieveAnswer : criterion.appliesTo === "apply" ? input.applicationAnswer : `${input.retrieveAnswer} ${input.applicationAnswer}`;
    const evidence = matchedTerms(answer, criterion.terms);
    return { id: criterion.id, label: criterion.label, met: evidence.length >= criterion.minimumMatches, evidence };
  });
  const criterionRatio = criteria.length ? criteria.filter((criterion) => criterion.met).length / criteria.length : 0;
  const lexicalScore = retrievalOnly ? matchedRetrieve * 0.8 : matchedRetrieve * 0.55 + matchedApply * 0.25;
  const score = Number(Math.max(0, lexicalScore + criterionRatio * 0.2 - (contradiction ? 0.45 : 0)).toFixed(3));
  const sourceMet = criteria.find((criterion) => criterion.id === "source-idea")?.met ?? matchedRetrieve >= 0.34;
  const reasoningMet = retrievalOnly ? sourceMet : (criteria.find((criterion) => criterion.id === "reasoning")?.met ?? matchedApply >= 0.2);
  const missing = criteria.find((criterion) => !criterion.met);

  if (!contradiction && retrieveWords >= 5 && applicationWords >= 5 && sourceMet && reasoningMet && score >= 0.34) {
    return { outcome: "success", score, label: "Strong evidence", explanation: retrievalOnly
        ? "The answer includes the source idea. Compare it with the passage above: matching terms cannot verify every nuance."
        : "The answer includes the source idea and a reasoned application. Compare it with the passage above: matching terms cannot verify every nuance.", matchedRetrieve, matchedApply, criteria, contradiction };
  }
  if (!contradiction && retrieveWords >= 3 && applicationWords >= 3 && (sourceMet || reasoningMet || score >= 0.16)) {
    return { outcome: "partial", score, label: "Partial evidence", explanation: missing ? `Some of the idea is here. Try again with: ${missing.label.toLocaleLowerCase()}.` : "Some of the idea is here. Compare your reasoning with the source before moving on.", matchedRetrieve, matchedApply, criteria, contradiction };
  }
  return { outcome: "failure", score, label: "Not enough evidence yet", explanation: contradiction ? "This may reverse or negate the relationship in the source. Recheck the original passage before trying again." : missing ? `The answer does not yet show enough of the source idea. Start with: ${missing.label.toLocaleLowerCase()}.` : "The answer does not yet show enough of the source idea. Recheck the passage and try again.", matchedRetrieve, matchedApply, criteria, contradiction };
}

export function evaluateDiagnosisResponse(input: { answer: string; modelAnswer: string; assessment?: LearningActivity["assessment"] }): AnswerEvaluation {
  return evaluateLearningResponse({ retrieveAnswer: input.answer, applicationAnswer: input.answer, retrieveModelAnswer: input.modelAnswer, applicationModelAnswer: input.modelAnswer, assessment: input.assessment, retrievalOnly: true });
}
