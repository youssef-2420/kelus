import type { RetrievalOutcome } from "./types";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "by", "for", "from", "has", "have", "if", "in",
  "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "then", "this", "to", "was", "when",
  "which", "while", "with", "would",
]);

function stem(token: string) {
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function evidenceTokens(value: string) {
  return [...new Set(
    value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token))
      .map(stem),
  )];
}

function coverage(answer: string, expected: string) {
  const expectedTokens = evidenceTokens(expected);
  if (!expectedTokens.length) return 0;
  const actual = new Set(evidenceTokens(answer));
  return expectedTokens.filter((token) => actual.has(token)).length / expectedTokens.length;
}

export type AnswerEvaluation = {
  outcome: RetrievalOutcome;
  score: number;
  label: "Strong evidence" | "Partial evidence" | "Not enough evidence yet";
  explanation: string;
  matchedRetrieve: number;
  matchedApply: number;
};

/**
 * Conservative, deterministic evidence check for the MVP. It does not claim to
 * understand meaning: it checks whether both responses contain enough of the
 * source-backed ideas Kelus asked the learner to retrieve and apply.
 */
export function evaluateLearningResponse(input: {
  retrieveAnswer: string;
  applicationAnswer: string;
  retrieveModelAnswer: string;
  applicationModelAnswer: string;
}): AnswerEvaluation {
  const retrieveWords = evidenceTokens(input.retrieveAnswer).length;
  const applicationWords = evidenceTokens(input.applicationAnswer).length;
  const matchedRetrieve = coverage(input.retrieveAnswer, input.retrieveModelAnswer);
  const matchedApply = coverage(input.applicationAnswer, input.applicationModelAnswer);
  const score = Number((matchedRetrieve * 0.65 + matchedApply * 0.35).toFixed(3));

  if (retrieveWords >= 5 && applicationWords >= 5 && matchedRetrieve >= 0.42 && matchedApply >= 0.2 && score >= 0.36) {
    return {
      outcome: "success",
      score,
      label: "Strong evidence",
      explanation: "Both answers include the central source-backed idea and use it in the new case.",
      matchedRetrieve,
      matchedApply,
    };
  }

  if (retrieveWords >= 3 && applicationWords >= 3 && (matchedRetrieve >= 0.18 || matchedApply >= 0.18) && score >= 0.14) {
    return {
      outcome: "partial",
      score,
      label: "Partial evidence",
      explanation: "Some relevant evidence is present, but one answer misses part of the expected relationship.",
      matchedRetrieve,
      matchedApply,
    };
  }

  return {
    outcome: "failure",
    score,
    label: "Not enough evidence yet",
    explanation: "The responses do not yet show enough of the expected source-backed idea to raise mastery.",
    matchedRetrieve,
    matchedApply,
  };
}

export function evaluateDiagnosisResponse(input: { answer: string; modelAnswer: string }): AnswerEvaluation {
  return evaluateLearningResponse({
    retrieveAnswer: input.answer,
    applicationAnswer: input.answer,
    retrieveModelAnswer: input.modelAnswer,
    applicationModelAnswer: input.modelAnswer,
  });
}
