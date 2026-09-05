import type {
  Concept,
  ExtractedMaterialPage,
  LearningActivity,
  Prompt,
  ProposedConcept,
} from "./types";

const ADMINISTRATIVE = /\b(?:assessment|attendance|calendar|contact|course syllabus|email|grading|instructor|office hours|policy|reading list|schedule|syllabus|textbook)\b/i;
const HEADING_PREFIX = /^(?:week|module|topic|chapter|unit|lecture|section)\s*\d*[.:\-–—]?\s*/i;
const NUMBER_PREFIX = /^\s*(?:\d+(?:\.\d+)*|[ivx]+)[.)\-:]\s*/i;

function cleanCandidate(value: string) {
  return value
    .replace(NUMBER_PREFIX, "")
    .replace(HEADING_PREFIX, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, "")
    .trim();
}

function looksLikeConcept(value: string) {
  if (value.length < 3 || value.length > 72 || ADMINISTRATIVE.test(value)) return false;
  if (/https?:|@|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(value)) return false;
  if (/\b(?:due|points?|percent|room|pm|am)\b/i.test(value)) return false;
  const words = value.split(/\s+/);
  if (words.length > 9) return false;
  const titleWords = words.filter((word) => /^[A-Z][A-Za-z/&-]*$/.test(word)).length;
  return HEADING_PREFIX.test(value) || NUMBER_PREFIX.test(value) || titleWords >= Math.max(1, Math.ceil(words.length * 0.55));
}

function stablePart(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function excerptFor(lines: string[], index: number, fallback: string) {
  const nearby = lines.slice(index + 1, index + 4).map((line) => line.trim()).filter((line) => line.length > 20);
  return (nearby[0] ?? fallback).slice(0, 360);
}

export function proposeConceptsFromPages(input: {
  materialId: string;
  sourceLabel: string;
  pages: ExtractedMaterialPage[];
  limit?: number;
}): ProposedConcept[] {
  const proposals: ProposedConcept[] = [];
  const seen = new Set<string>();
  const limit = input.limit ?? 12;

  for (const page of input.pages) {
    const lines = page.text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    lines.forEach((line, index) => {
      if (proposals.length >= limit || !looksLikeConcept(line)) return;
      const name = cleanCandidate(line);
      const key = name.toLocaleLowerCase();
      if (!looksLikeConcept(name) || seen.has(key)) return;
      seen.add(key);
      const locator = `Page ${page.pageNumber}`;
      proposals.push({
        id: `proposal-${stablePart(`${input.materialId}:${key}`)}`,
        materialId: input.materialId,
        name,
        sourceLabel: input.sourceLabel,
        locator,
        sourceExcerpt: excerptFor(lines, index, line),
      });
    });
  }
  return proposals;
}

export function buildConfirmedMaterialModel(input: {
  proposals: ProposedConcept[];
  courseId: string;
  userId: string;
  nowIso: string;
}) {
  const concepts: Concept[] = input.proposals.map((proposal) => ({
    id: `c-source-${stablePart(`${input.courseId}:${proposal.name.toLocaleLowerCase()}`)}`,
    courseId: input.courseId,
    userId: input.userId,
    name: proposal.name,
    examImportance: 0.7,
    difficulty: 0.5,
    estimatedMinutes: 18,
    mastery: 0,
    confidence: 0,
    predictedRetention: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    retrievalAttempts: 0,
    successfulRetrievals: 0,
    failedRetrievals: 0,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  }));
  const proposalByName = new Map(input.proposals.map((proposal) => [proposal.name, proposal]));
  const prompts: Prompt[] = concepts.map((concept) => {
    const proposal = proposalByName.get(concept.name)!;
    return {
      id: `p-${concept.id}`,
      conceptId: concept.id,
      promptText: `Explain ${concept.name} in your own words using the course source.`,
      modelAnswer: proposal.sourceExcerpt,
    };
  });
  const learningActivities: LearningActivity[] = concepts.map((concept) => {
    const proposal = proposalByName.get(concept.name)!;
    return {
      id: `activity-${concept.id}`,
      conceptId: concept.id,
      learn: {
        title: `Build a usable explanation of ${concept.name}.`,
        explanation: proposal.sourceExcerpt,
        keyPoints: [
          `Locate the central claim about ${concept.name}.`,
          "Close the source, then reconstruct that claim from memory.",
        ],
      },
      retrieve: {
        prompt: `What is the central idea behind ${concept.name}?`,
        hint: `Return to ${proposal.locator} and identify the relationship or definition attached to this topic.`,
        explanation: proposal.sourceExcerpt,
        example: `Connect ${concept.name} to one example from your lecture or notes.`,
        modelAnswer: proposal.sourceExcerpt,
      },
      apply: {
        prompt: `Use ${concept.name} to explain a new example or situation.`,
        hint: "Keep the source's central relationship, but change the context.",
        modelAnswer: `A sound application should preserve the source's central claim: ${proposal.sourceExcerpt}`,
      },
      sourceReferences: [{ materialId: proposal.materialId, label: proposal.sourceLabel, locator: proposal.locator }],
    };
  });
  // Ordering in a PDF is not evidence of a prerequisite relationship. Keep the
  // graph unconnected until a relationship is confirmed or explicitly stated.
  const relationships: [] = [];
  return { concepts, prompts, learningActivities, relationships };
}
