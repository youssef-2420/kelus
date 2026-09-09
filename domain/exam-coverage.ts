import { ROUTING } from "./constants";
import { deriveStatus } from "./learner-model";
import { rankLearningActions } from "./routing-engine";
import { daysUntilExam } from "./scheduler";
import type { Concept, ConceptRelationship, Exam, LearningEvent } from "./types";

export const EXAM_COVERAGE_MAX_DAYS = 21;

export type ExamCoverageStop = {
  conceptId: string;
  name: string;
  minutes: number;
  status: ReturnType<typeof deriveStatus>;
};

export type ExamCoverageDay = {
  offset: number;
  dateIso: string;
  minutes: number;
  stops: ExamCoverageStop[];
};

export type ExamCoveragePlan = {
  remainingDays: number;
  /** Days actually scheduled in this plan (≤ EXAM_COVERAGE_MAX_DAYS). */
  horizonDays: number;
  /** True when remainingDays exceeds the free/capped planning window. */
  horizonCapped: boolean;
  minutesPerDay: number;
  needCount: number;
  seatedCount: number;
  uncoveredCount: number;
  days: ExamCoverageDay[];
  uncoveredNames: string[];
};

const NEEDS_SESSION = new Set(["weak", "fading", "not_learned"]);

function addUtcDays(nowIso: string, days: number) {
  return new Date(Date.parse(nowIso) + days * 86_400_000).toISOString();
}

function stopMinutes(concept: Concept, budget: number) {
  const estimate = Number.isFinite(concept.estimatedMinutes) ? concept.estimatedMinutes : 12;
  const wanted = Math.max(
    ROUTING.minimumConceptMinutes,
    Math.min(ROUTING.maximumConceptMinutes, Math.round(estimate)),
  );
  if (wanted <= budget) return wanted;
  if (budget >= ROUTING.minimumConceptMinutes) return budget;
  return 0;
}

export function buildExamCoveragePlan(input: {
  concepts: Concept[];
  relationships: ConceptRelationship[];
  events: LearningEvent[];
  exam: Exam;
  nowIso: string;
}): ExamCoveragePlan {
  const remainingDays = daysUntilExam(input.exam, input.nowIso);
  const minutesPerDay = Math.max(
    ROUTING.minimumSessionMinutes,
    Math.min(ROUTING.maximumSessionMinutes, input.exam.availableMinutes),
  );
  const ranked = rankLearningActions(input);
  const withStatus = ranked.map((row) => ({
    ...row,
    status: deriveStatus(row.concept.mastery, row.concept.predictedRetention, row.concept.retrievalAttempts),
  }));
  const needsWork = withStatus.filter((row) => NEEDS_SESSION.has(row.status));
  const maintenance = withStatus.filter((row) => !NEEDS_SESSION.has(row.status));
  const queue = [...needsWork, ...maintenance];
  const seated = new Set<string>();
  const days: ExamCoverageDay[] = [];
  const horizonDays = Math.min(remainingDays, EXAM_COVERAGE_MAX_DAYS);
  const horizonCapped = remainingDays > EXAM_COVERAGE_MAX_DAYS;

  for (let offset = 1; offset <= horizonDays; offset += 1) {
    let budget = minutesPerDay;
    const stops: ExamCoverageStop[] = [];
    while (queue.length && stops.length < ROUTING.maximumConceptStops && budget >= ROUTING.minimumConceptMinutes) {
      const next = queue.shift();
      if (!next) break;
      const minutes = stopMinutes(next.concept, budget);
      if (!minutes) {
        queue.unshift(next);
        break;
      }
      stops.push({
        conceptId: next.concept.id,
        name: next.concept.name,
        minutes,
        status: next.status,
      });
      seated.add(next.concept.id);
      budget -= minutes;
    }
    if (!stops.length) break;
    days.push({
      offset,
      dateIso: addUtcDays(input.nowIso, offset),
      minutes: stops.reduce((sum, stop) => sum + stop.minutes, 0),
      stops,
    });
  }

  const uncovered = needsWork.filter((row) => !seated.has(row.concept.id));
  return {
    remainingDays,
    horizonDays,
    horizonCapped,
    minutesPerDay,
    needCount: needsWork.length,
    seatedCount: needsWork.filter((row) => seated.has(row.concept.id)).length,
    uncoveredCount: uncovered.length,
    days,
    uncoveredNames: uncovered.map((row) => row.concept.name),
  };
}

function horizonPhrase(plan: ExamCoveragePlan) {
  if (plan.horizonCapped) {
    return `the next ${plan.horizonDays} planned days (of ${plan.remainingDays} until the exam)`;
  }
  return `the next ${plan.remainingDays} day${plan.remainingDays === 1 ? "" : "s"}`;
}

export function examCoverageHeadline(plan: ExamCoveragePlan) {
  if (plan.remainingDays <= 0) {
    return "Exam day is today. Use Today’s route — there are no remaining days to plan.";
  }
  if (plan.needCount === 0) {
    return `At ${plan.minutesPerDay} min/day for ${horizonPhrase(plan)}, Kelus can keep a light review calendar so strong topics do not fade.`;
  }
  if (plan.uncoveredCount === 0) {
    if (plan.horizonCapped) {
      return `At ${plan.minutesPerDay} min/day over ${horizonPhrase(plan)}, all ${plan.needCount} topic${plan.needCount === 1 ? "" : "s"} that still need a session fit in this planning window.`;
    }
    return `At ${plan.minutesPerDay} min/day, all ${plan.needCount} topic${plan.needCount === 1 ? "" : "s"} that still need a session fit before the exam.`;
  }
  if (plan.horizonCapped) {
    return `At ${plan.minutesPerDay} min/day over ${horizonPhrase(plan)}, ${plan.seatedCount} of ${plan.needCount} topics that still need a session get a slot. ${plan.uncoveredCount} would be left at this pace.`;
  }
  return `At ${plan.minutesPerDay} min/day, ${plan.seatedCount} of ${plan.needCount} topics that still need a session get a slot. ${plan.uncoveredCount} would be left at this pace.`;
}
