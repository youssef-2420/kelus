import type {
  Concept,
  ConceptRelationship,
  ExtractedMaterialPage,
  LearningActivity,
  Prompt,
  ProposedConcept,
} from "./types";

const ADMINISTRATIVE =
  /\b(?:assessment|attendance|calendar|contact|course syllabus|email|grading|instructor|office hours|policy|reading list|schedule|syllabus|textbook)\b/i;
const HEADING_PREFIX = /^(?:week|module|topic|chapter|unit|lecture|section)\s*\d*[.:\-–—]?\s*/i;
const NUMBER_PREFIX = /^\s*(?:\d+(?:\.\d+)*|[ivx]+)[.)\-:]\s*/i;
const EXAM_SIGNAL =
  /\b(?:exam|midterm|final|tests?|tested|assessment|learning objectives?|will be asked|must know|high-?yield|core concept|key concept|important|critical|essential|fundamental)\b/i;
const DEFINITION_SIGNAL =
  /\b(?:is defined as|refers to|means that|measures|describes|occurs when|happens when|is the|are the)\b/i;
const PREREQ_SIGNAL =
  /\b(?:prerequisites?|requires?|required|depends on|dependent on|builds on|built on|based on|before studying|after mastering|extension of|application of|assumes knowledge of|you should already know)\b/i;
const RELATED_SIGNAL = /\b(?:related to|closely related|see also|compared with|in contrast to|versus|vs\.?)\b/i;

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
  const nearby: string[] = [];
  for (const raw of lines.slice(index + 1, index + 8)) {
    const line = raw.trim();
    if (!line) {
      if (nearby.length) break;
      continue;
    }
    if (looksLikeConcept(line) && nearby.length) break;
    if (line.length > 18 && !looksLikeConcept(line)) nearby.push(line);
    if (nearby.join(" ").length >= 520) break;
  }
  return (nearby.length ? nearby.join(" ") : fallback).slice(0, 700);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pageNumberFromLocator(locator: string) {
  const match = locator.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function mentionCount(name: string, corpus: string) {
  return corpus.match(new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi"))?.length ?? 0;
}

function sentencesFrom(excerpt: string) {
  return excerpt
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 18);
}

function centralClaim(name: string, excerpt: string) {
  const sentences = sentencesFrom(excerpt);
  if (!sentences.length) return excerpt.slice(0, 220);
  const named = sentences.find((sentence) => sentence.toLocaleLowerCase().includes(name.toLocaleLowerCase()));
  const defined = sentences.find((sentence) => DEFINITION_SIGNAL.test(sentence));
  return (named ?? defined ?? sentences[0]).slice(0, 260);
}

type SubjectMode = "biology" | "computer_science" | "history" | "law" | "mathematics" | "general";

function subjectModeFor(name: string, excerpt: string): SubjectMode {
  const evidence = `${name} ${excerpt}`;
  if (/\b(?:cell|cellular|dna|gene|protein|enzyme|organism|membrane|metabolism|metabolic|photosynthesis|respiration|evolution|homeostasis)\b/i.test(evidence)) return "biology";
  if (/\b(?:algebra|calculate|calculus|derivative|equation|geometry|integral|limit|matrix|polynomial|probability|proof|theorem|vector)\b/i.test(evidence)) return "mathematics";
  if (/\b(?:algorithm|array|binary|compiler|complexity|data structure|database|memory|network|program|recursion|runtime|software)\b/i.test(evidence)) return "computer_science";
  if (/\b(?:century|colonial|empire|historical|revolution|treaty|war|dynasty|industrialization|migration)\b/i.test(evidence)) return "history";
  if (/\b(?:case law|claimant|contract|court|defendant|doctrine|liability|precedent|statute|tort|jurisdiction)\b/i.test(evidence)) return "law";
  return "general";
}

function activityLanguage(mode: SubjectMode, name: string, claim: string) {
  switch (mode) {
    case "biology":
      return {
        learnTitle: `Trace the mechanism behind ${name}.`,
        retrievePrompt: `Without looking, describe the mechanism or relationship the source gives for ${name}.`,
        applyPrompt: `Suppose one required part of ${name} is reduced or blocked. Predict the consequence and trace the mechanism.`,
        applyHint: "Name the changed component, then trace its effect through the system.",
        applyAnswer: `A sound answer identifies the changed component and uses this source-backed mechanism to predict the result: ${claim}`,
      };
    case "computer_science":
      return {
        learnTitle: `Trace how ${name} behaves.`,
        retrievePrompt: `Without looking, explain the rule or process the source gives for ${name}.`,
        applyPrompt: `Suppose the input grows or one required condition fails. Trace how ${name} behaves and name the resulting state or output.`,
        applyHint: "State the input, follow the process in order, and name the resulting state or output.",
        applyAnswer: `A sound trace follows the source-backed process step by step and reaches a consistent output: ${claim}`,
      };
    case "history":
      return {
        learnTitle: `Explain the forces shaping ${name}.`,
        retrievePrompt: `Without looking, state the source's central causal claim about ${name}.`,
        applyPrompt: `Suppose the source's main causal condition were weaker. Explain how that could alter the historical outcome.`,
        applyHint: "Name the changed condition, connect it to the source's cause, then explain the likely consequence.",
        applyAnswer: `A sound answer preserves the source's causal relationship while changing the historical condition: ${claim}`,
      };
    case "law":
      return {
        learnTitle: `Make the rule in ${name} usable.`,
        retrievePrompt: `Without looking, state the rule or legal test the source gives for ${name}.`,
        applyPrompt: `Suppose one required element of the rule for ${name} is missing. Apply the rule and give a qualified conclusion.`,
        applyHint: "State the rule, connect each relevant fact to it, then give a qualified conclusion.",
        applyAnswer: `A sound application states the source-backed rule, tests the relevant facts, and reaches a supported conclusion: ${claim}`,
      };
    case "mathematics":
      return {
        learnTitle: `Reconstruct the method behind ${name}.`,
        retrievePrompt: `Without looking, state the rule, theorem, or method the source gives for ${name}.`,
        applyPrompt: `Suppose one condition of the rule or method for ${name} is not satisfied. Show what can still be concluded and why.`,
        applyHint: "Name the rule first, substitute or transform carefully, and check the result against the conditions.",
        applyAnswer: `A sound solution names the source-backed method, applies it step by step, and checks its conditions: ${claim}`,
      };
    default:
      return {
        learnTitle: `Make ${name} usable from the source.`,
        retrievePrompt: `Without looking, what central claim does the course make about ${name}?`,
        applyPrompt: `Apply the source's claim about ${name} to a new example that is not copied from the page.`,
        applyHint: "Keep the same underlying relationship. Change only the situation.",
        applyAnswer: `A strong answer reuses this source-backed claim in a new context: ${claim}`,
      };
  }
}

const RUBRIC_STOPWORDS = new Set(["answer", "application", "claim", "course", "idea", "identifies", "new", "result", "sound", "source", "source-backed", "uses"]);

function rubricTerms(value: string) {
  return [...new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}-]+/gu, " ").split(/\s+/)
    .filter((word) => word.length > 3 && !RUBRIC_STOPWORDS.has(word)))].slice(0, 10);
}

function assessmentFor(mode: SubjectMode, name: string, claim: string): NonNullable<LearningActivity["assessment"]> {
  const sourceTerms = rubricTerms(`${name} ${claim}`);
  const modeCriterion = {
    biology: { label: "Traces a mechanism and consequence", terms: ["because", "causes", "leads", "therefore", "result"] },
    computer_science: { label: "Traces input, process, and output", terms: ["input", "step", "process", "output", "result"] },
    history: { label: "Connects cause to historical consequence", terms: ["because", "caused", "led", "therefore", "consequence"] },
    law: { label: "Applies the rule to facts and reaches a conclusion", terms: ["rule", "fact", "element", "because", "conclusion"] },
    mathematics: { label: "Uses the rule and checks its conditions", terms: ["condition", "therefore", "because", "step", "result"] },
    general: { label: "Explains the relationship, not only the label", terms: ["because", "means", "leads", "therefore", "example"] },
  }[mode];
  return {
    mode,
    criteria: [
      { id: "source-idea", label: "Uses the central source idea", terms: sourceTerms, minimumMatches: Math.min(3, Math.max(1, Math.ceil(sourceTerms.length * 0.3))), appliesTo: "both" },
      { id: "reasoning", ...modeCriterion, minimumMatches: 1, appliesTo: "apply" },
      { id: "transfer", label: "Transfers the idea beyond memorized wording", terms: ["if", "when", "because", "therefore", "would", "could"], minimumMatches: 1, appliesTo: "apply" },
    ],
  };
}

function headingStrengthFor(name: string) {
  let strength = 0.35;
  if (NUMBER_PREFIX.test(name) || /^\d+/.test(name)) strength += 0.25;
  if (HEADING_PREFIX.test(name)) strength += 0.25;
  if (name === name.toUpperCase() && name.length > 4) strength += 0.1;
  return clamp(strength, 0, 1);
}

function scoreExamImportance(input: {
  name: string;
  excerpt: string;
  locator: string;
  corpus: string;
  index: number;
  total: number;
}) {
  let score = 0.52;
  score += clamp((mentionCount(input.name, input.corpus) - 1) * 0.035, 0, 0.14);
  score += headingStrengthFor(input.name) * 0.08;
  if (EXAM_SIGNAL.test(input.excerpt) || EXAM_SIGNAL.test(input.name)) score += 0.12;
  if (DEFINITION_SIGNAL.test(input.excerpt)) score += 0.05;
  if (pageNumberFromLocator(input.locator) <= 2) score += 0.04;
  score += clamp(((input.total - input.index) / Math.max(input.total, 1)) * 0.04, 0, 0.04);
  return clamp(Number(score.toFixed(3)), 0.35, 0.95);
}

function scoreDifficulty(excerpt: string) {
  let score = 0.45;
  if (excerpt.length > 180) score += 0.08;
  if (/\b(?:however|whereas|trade-?off|equilibrium|derivative|integral|theorem|proof|paradox)\b/i.test(excerpt)) {
    score += 0.12;
  }
  if (/\d/.test(excerpt)) score += 0.05;
  return clamp(Number(score.toFixed(3)), 0.3, 0.8);
}

function buildActivity(concept: Concept, proposal: ProposedConcept): LearningActivity {
  const claim = centralClaim(concept.name, proposal.sourceExcerpt);
  const language = activityLanguage(subjectModeFor(concept.name, proposal.sourceExcerpt), concept.name, claim);
  return {
    id: `activity-${concept.id}`,
    conceptId: concept.id,
    learn: {
      title: language.learnTitle,
      explanation: claim,
      keyPoints: [
        `Find the claim the source makes about ${concept.name}.`,
        "Cover the excerpt, then restate that claim without looking.",
        `Keep one concrete detail from ${proposal.locator} so the idea stays grounded.`,
      ],
    },
    retrieve: {
      prompt: language.retrievePrompt,
      hint: `Return to ${proposal.locator}. Start from the relationship or definition, not a list of facts.`,
      explanation: claim,
      example: `Restate the source claim about ${concept.name} in one sentence, then add one detail from ${proposal.locator}.`,
      modelAnswer: claim,
    },
    apply: {
      prompt: language.applyPrompt,
      hint: language.applyHint,
      modelAnswer: language.applyAnswer,
    },
    assessment: assessmentFor(subjectModeFor(concept.name, proposal.sourceExcerpt), concept.name, claim),
    sourceReferences: [{ materialId: proposal.materialId, label: proposal.sourceLabel, locator: proposal.locator }],
  };
}

function inferRelationships(concepts: Concept[], corpus: string): ConceptRelationship[] {
  const relationships: ConceptRelationship[] = [];
  const seen = new Set<string>();

  for (const left of concepts) {
    for (const right of concepts) {
      if (left.id === right.id) continue;
      const leftPattern = escapeRegExp(left.name);
      const rightPattern = escapeRegExp(right.name);

      // "Elasticity builds on Supply and Demand" => Supply and Demand → Elasticity
      const dependsOn = new RegExp(
        `\\b${leftPattern}\\b[\\s\\S]{0,40}\\b(?:requires|required|depends on|dependent on|builds on|built on|based on|assumes knowledge of)\\b[\\s\\S]{0,40}\\b${rightPattern}\\b`,
        "i",
      );
      // "Supply and Demand is a prerequisite for Elasticity"
      const precedes = new RegExp(
        `\\b${leftPattern}\\b[\\s\\S]{0,40}\\b(?:prerequisite for|before studying|before learning)\\b[\\s\\S]{0,40}\\b${rightPattern}\\b`,
        "i",
      );
      // Both names must be the related pair — not "related to Something Else".
      const related = new RegExp(
        `\\b${leftPattern}\\b[\\s\\S]{0,40}\\b(?:related to|closely related|see also|compared with|in contrast to|versus|vs\\.?)\\b[\\s\\S]{0,40}\\b${rightPattern}\\b`,
        "i",
      );

      let kind: ConceptRelationship["kind"] | null = null;
      let fromId = left.id;
      let toId = right.id;

      if (dependsOn.test(corpus)) {
        kind = "prerequisite";
        fromId = right.id;
        toId = left.id;
      } else if (precedes.test(corpus)) {
        kind = "prerequisite";
        fromId = left.id;
        toId = right.id;
      } else if (related.test(corpus)) {
        kind = "related";
      }
      if (!kind) continue;

      const key = `${kind}:${fromId}:${toId}`;
      const reverse = `${kind}:${toId}:${fromId}`;
      if (seen.has(key) || (kind === "related" && seen.has(reverse))) continue;
      if (kind === "prerequisite" && seen.has(`prerequisite:${toId}:${fromId}`)) continue;
      seen.add(key);
      relationships.push({ id: `rel-${stablePart(key)}`, fromId, toId, kind });
    }
  }

  return relationships.slice(0, 12);
}

function looksLikeConceptRelaxed(value: string) {
  if (value.length < 3 || value.length > 80 || ADMINISTRATIVE.test(value)) return false;
  if (/https?:|@|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(value)) return false;
  if (/\b(?:due|points?|percent|room)\b/i.test(value)) return false;
  const words = value.split(/\s+/);
  if (words.length > 12) return false;
  const titleWords = words.filter((word) => /^[A-Z][A-Za-z/&-]*$/.test(word)).length;
  return (
    HEADING_PREFIX.test(value) ||
    NUMBER_PREFIX.test(value) ||
    titleWords >= Math.max(1, Math.ceil(words.length * 0.35)) ||
    words.length <= 4
  );
}

function splitSparseLines(text: string) {
  return text
    .split(/\n+|•|;|—|–|\u2022/g)
    .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((line) => line.trim())
    .filter(Boolean);
}

export function proposeConceptsFromPages(input: {
  materialId: string;
  sourceLabel: string;
  pages: ExtractedMaterialPage[];
  limit?: number;
  mode?: "strict" | "relaxed";
}): ProposedConcept[] {
  const proposals: ProposedConcept[] = [];
  const seen = new Set<string>();
  const limit = input.limit ?? 12;
  const matcher = input.mode === "relaxed" ? looksLikeConceptRelaxed : looksLikeConcept;

  for (const page of input.pages) {
    const lines = (input.mode === "relaxed" ? splitSparseLines(page.text) : page.text.split(/\n+/).map((line) => line.trim()).filter(Boolean));
    const bodySizes = page.blocks?.map((block) => block.fontSize).filter((size) => size > 0).sort((a, b) => a - b) ?? [];
    const bodySize = bodySizes.length ? bodySizes[Math.floor(bodySizes.length / 2)] : 0;
    const layoutHeadings = new Set(page.blocks?.filter((block) => bodySize > 0 && block.fontSize >= bodySize * 1.16 && block.text.length <= 96).map((block) => cleanCandidate(block.text).toLocaleLowerCase()) ?? []);
    lines.forEach((line, index) => {
      const layoutHeading = layoutHeadings.has(cleanCandidate(line).toLocaleLowerCase());
      if (proposals.length >= limit || (!matcher(line) && !layoutHeading)) return;
      const name = cleanCandidate(line);
      const key = name.toLocaleLowerCase();
      if ((!matcher(name) && !layoutHeading) || seen.has(key) || ADMINISTRATIVE.test(name)) return;
      seen.add(key);
      proposals.push({
        id: `proposal-${stablePart(`${input.materialId}:${key}`)}`,
        materialId: input.materialId,
        name,
        sourceLabel: input.sourceLabel,
        locator: page.pageNumber === 0 ? "Document outline" : `Page ${page.pageNumber}`,
        sourceExcerpt: excerptFor(lines, index, line),
      });
    });
  }
  return proposals;
}

const METADATA_STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "to", "in", "on", "for", "with", "from",
  "week", "lecture", "notes", "note", "pdf", "syllabus", "chapter", "unit",
  "final", "midterm", "exam", "course", "intro", "introduction", "part",
  "section", "doc", "handout", "slides", "slide", "reading", "assignment",
]);

export function proposeConceptsFromMetadata(input: {
  materialId: string;
  sourceLabel: string;
  fileName?: string | null;
  limit?: number;
}): ProposedConcept[] {
  const limit = input.limit ?? 4;
  const raw = `${input.sourceLabel} ${input.fileName ?? ""}`
    .replace(/\.pdf$/i, " ")
    .replace(/[-_+/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return [];

  const phrases: string[] = [];
  const cleanedTitle = cleanCandidate(raw);
  if (cleanedTitle.length >= 3 && cleanedTitle.length <= 72) phrases.push(cleanedTitle);

  for (const token of raw.split(/\s+/)) {
    const word = token.replace(/[^A-Za-z&/-]/g, "");
    if (word.length < 4) continue;
    if (METADATA_STOPWORDS.has(word.toLocaleLowerCase())) continue;
    if (/^\d+$/.test(word)) continue;
    phrases.push(word[0].toUpperCase() + word.slice(1));
  }

  const proposals: ProposedConcept[] = [];
  const seen = new Set<string>();
  for (const phrase of phrases) {
    if (proposals.length >= limit) break;
    const name = cleanCandidate(phrase);
    const key = name.toLocaleLowerCase();
    if (!name || seen.has(key) || ADMINISTRATIVE.test(name)) continue;
    seen.add(key);
    proposals.push({
      id: `proposal-${stablePart(`${input.materialId}:meta:${key}`)}`,
      materialId: input.materialId,
      name,
      sourceLabel: input.sourceLabel,
      locator: "From filename",
      sourceExcerpt: `Suggested from the file title “${input.sourceLabel}”. Edit or remove anything that is not an exam concept.`,
    });
  }
  return proposals;
}

export function buildConfirmedMaterialModel(input: {
  proposals: ProposedConcept[];
  courseId: string;
  userId: string;
  nowIso: string;
  pages?: ExtractedMaterialPage[];
}) {
  const corpus = [
    ...(input.pages ?? []).map((page) => page.text),
    ...input.proposals.map((proposal) => `${proposal.name}\n${proposal.sourceExcerpt}`),
  ].join("\n");

  const concepts: Concept[] = input.proposals.map((proposal, index) => ({
    id: `c-source-${stablePart(`${input.courseId}:${proposal.name.toLocaleLowerCase()}`)}`,
    courseId: input.courseId,
    userId: input.userId,
    name: proposal.name,
    examImportance: scoreExamImportance({
      name: proposal.name,
      excerpt: proposal.sourceExcerpt,
      locator: proposal.locator,
      corpus,
      index,
      total: input.proposals.length,
    }),
    difficulty: scoreDifficulty(proposal.sourceExcerpt),
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

  const uniqueScores = new Set(concepts.map((concept) => concept.examImportance.toFixed(2)));
  if (concepts.length > 1 && uniqueScores.size === 1) {
    concepts.forEach((concept, index) => {
      concept.examImportance = clamp(
        Number((concept.examImportance + (concepts.length - index - 1) * 0.02 - index * 0.01).toFixed(3)),
        0.35,
        0.95,
      );
    });
  }

  const proposalByName = new Map(input.proposals.map((proposal) => [proposal.name, proposal]));
  const prompts: Prompt[] = concepts.map((concept) => {
    const proposal = proposalByName.get(concept.name)!;
    return {
      id: `p-${concept.id}`,
      conceptId: concept.id,
      promptText: `Explain the central claim about ${concept.name} from the course source.`,
      modelAnswer: centralClaim(concept.name, proposal.sourceExcerpt),
    };
  });
  const learningActivities: LearningActivity[] = concepts.map((concept) =>
    buildActivity(concept, proposalByName.get(concept.name)!),
  );
  const relationships = inferRelationships(concepts, corpus);
  return { concepts, prompts, learningActivities, relationships };
}
