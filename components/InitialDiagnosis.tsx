"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { kelusDuration, kelusEase } from "@/components/motion";
import { evaluateDiagnosisResponse } from "@/domain/answer-evaluation";
import { DIAGNOSIS_RETRIEVAL_LIMIT } from "@/domain/constants";
import type { LearnerSnapshot, RetrievalOutcome, SelfRating } from "@/domain/types";
import { selectDiagnosisConcept } from "@/domain/diagnosis";
import { trackEvent } from "@/lib/analytics";
import {
  INITIAL_DIAGNOSIS_STATE,
  allRated as areAllRated,
  canCompare,
  reduceDiagnosis,
  type DiagnosisState,
} from "@/lib/diagnosis-machine";

const RATINGS: Array<{ value: SelfRating; label: string }> = [
  { value: "dont_know", label: "Don’t know" },
  { value: "weak", label: "Weak" },
  { value: "okay", label: "Okay" },
  { value: "strong", label: "Strong" },
];

export function InitialDiagnosis({ snapshot, onComplete }: {
  snapshot: LearnerSnapshot;
  onComplete: (input: {
    ratings: Record<string, SelfRating>;
    retrievals: Array<{
      conceptId: string;
      promptId: string;
      responseText: string;
      outcome: RetrievalOutcome;
      responseTimeMs: number;
    }>;
  }) => void;
}) {
  const reduceMotion = useReducedMotion() === true;
  const concepts = snapshot.concepts;
  const ratedConcepts = useMemo(
    () => [...concepts].sort((a, b) => b.examImportance - a.examImportance || a.name.localeCompare(b.name)).slice(0, 3),
    [concepts],
  );
  const [diagnosis, setDiagnosis] = useState<DiagnosisState>(INITIAL_DIAGNOSIS_STATE);
  const startedAt = useRef(0);

  const dispatch = (event: Parameters<typeof reduceDiagnosis>[1]) => {
    setDiagnosis((current) => reduceDiagnosis(current, event));
  };

  const { phase, ratings, retrievals } = diagnosis;
  const activeId = phase.status === "answering" || phase.status === "revealed" ? phase.conceptId : null;
  const concept = concepts.find((item) => item.id === activeId);
  const prompt = snapshot.prompts.find((item) => item.conceptId === concept?.id);
  const activity = snapshot.learningActivities.find((item) => item.conceptId === concept?.id);
  const allRated = areAllRated(ratings, ratedConcepts.map((item) => item.id));
  const selectionReason = phase.status === "answering" || phase.status === "revealed" ? phase.reason : "";
  const answer = phase.status === "answering" || phase.status === "revealed" ? phase.answer : "";
  const evaluation = phase.status === "revealed" ? phase.evaluation : null;

  useEffect(() => {
    if (phase.status !== "revealed") return;
    const frame = requestAnimationFrame(() => document.getElementById("diagnosis-evaluation-title")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  function beginChecks(event: SyntheticEvent) {
    if (!allRated) return;
    const selected = selectDiagnosisConcept({
      concepts,
      relationships: snapshot.relationships,
      ratings,
      evidence: [],
      maximumChecks: DIAGNOSIS_RETRIEVAL_LIMIT,
    });
    if (!selected) {
      trackEvent({ name: "diagnosis_completed", retrieval_count: 0 });
      onComplete({ ratings, retrievals: [] });
      return;
    }
    startedAt.current = event.timeStamp;
    dispatch({ type: "BEGIN_CHECKS", conceptId: selected.concept.id, reason: selected.reason });
  }

  function grade(outcome: RetrievalOutcome, event: SyntheticEvent) {
    if (!concept || !prompt || phase.status !== "revealed") return;
    const retrieval = {
      conceptId: concept.id,
      promptId: prompt.id,
      responseText: phase.answer,
      outcome,
      responseTimeMs: Math.max(0, Math.round(event.timeStamp - startedAt.current)),
    };
    const completed = [...retrievals, retrieval];
    const selected = selectDiagnosisConcept({
      concepts,
      relationships: snapshot.relationships,
      ratings,
      evidence: completed.map((item) => ({ conceptId: item.conceptId, outcome: item.outcome })),
      maximumChecks: DIAGNOSIS_RETRIEVAL_LIMIT,
    });
    if (!selected) {
      dispatch({ type: "GRADE_FINISH", retrieval });
      trackEvent({ name: "diagnosis_completed", retrieval_count: completed.length });
      onComplete({ ratings, retrievals: completed });
      return;
    }
    startedAt.current = event.timeStamp;
    dispatch({
      type: "GRADE_NEXT",
      retrieval,
      conceptId: selected.concept.id,
      reason: selected.reason,
    });
  }

  function compareAnswer() {
    if (!prompt || phase.status !== "answering" || !canCompare(phase)) return;
    dispatch({
      type: "COMPARE",
      evaluation: evaluateDiagnosisResponse({
        answer: phase.answer,
        modelAnswer: prompt.modelAnswer,
        assessment: activity?.assessment,
      }),
    });
  }

  const phaseMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduceMotion ? kelusDuration.micro : kelusDuration.normal, ease: kelusEase },
  };

  return (
    <AppShell>
    <div className="diagnosis-page is-booklet-product">
      <div className="flow-context diagnosis-context"><span>One quick evidence check · then today’s first stop</span><b>Initial estimate</b></div>
      <AnimatePresence mode="wait" initial={false}>
      {phase.status === "rating" ? (
        <motion.section key="rating" className="diagnosis-panel" {...phaseMotion}>
          <p className="kicker">Start with your judgment</p>
          <h1>How familiar do these feel?</h1>
          <p className="diagnosis-intro">
            Rate these {ratedConcepts.length} suggested topics. A short recall check helps Kelus choose your starting point — rough answers are enough.
          </p>
          <ol className="diagnosis-list">
            {ratedConcepts.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <div role="group" aria-label={`Familiarity with ${item.name}`}>
                  {RATINGS.map((rating) => {
                    const selected = ratings[item.id] === rating.value;
                    return (
                      <button
                        key={rating.value}
                        type="button"
                        className={selected ? "is-selected" : undefined}
                        aria-pressed={selected}
                        onClick={() => dispatch({ type: "RATE", conceptId: item.id, rating: rating.value })}
                      >
                        {rating.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
          <div className="diagnosis-cta">
            <button type="button" className="cta diagnosis-continue" disabled={!allRated} onClick={beginChecks}>
              {allRated ? "Recall check, then today’s route" : "Rate every topic first"}
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="text-btn diagnosis-skip"
              disabled={!allRated}
              onClick={() => {
                trackEvent({ name: "diagnosis_completed", retrieval_count: 0 });
                onComplete({ ratings, retrievals: [] });
              }}
            >
              Skip recall — open Today with a rough estimate
            </button>
          </div>
        </motion.section>
      ) : concept && prompt ? (
        <motion.section key={`check-${concept.id}-${phase.status}`} className="diagnosis-check" {...phaseMotion}>
          <p className="kicker">Recall check {retrievals.length + 1} of {DIAGNOSIS_RETRIEVAL_LIMIT}</p>
          <h1>{prompt.promptText}</h1>
          <p className="diagnosis-selection-reason">{selectionReason}</p>
          {phase.status === "answering" ? (
            <>
              <label htmlFor="diagnosis-answer">Try without notes.</label>
              <textarea
                id="diagnosis-answer"
                autoFocus
                value={answer}
                onChange={(event) => dispatch({ type: "SET_ANSWER", answer: event.target.value })}
              />
              <button type="button" className="cta" disabled={!canCompare(phase)} onClick={compareAnswer}>Compare answer</button>
            </>
          ) : evaluation ? (
            <div className="diagnosis-feedback">
              <p className="kicker">A useful answer includes</p>
              <p>{prompt.modelAnswer}</p>
              <div className={`diagnosis-evaluation is-${evaluation.outcome}`} role="status">
                <p className="kicker">Kelus evidence check</p>
                <h2 id="diagnosis-evaluation-title" tabIndex={-1}>{evaluation.label}</h2>
                <p>{evaluation.explanation}</p>
                {evaluation.criteria.length ? (
                  <ul className="answer-criteria" aria-label="Assessment criteria">
                    {evaluation.criteria.map((criterion) => (
                      <li key={criterion.id} className={criterion.met ? "is-met" : "is-missing"}>
                        <span aria-hidden="true">{criterion.met ? "✓" : "○"}</span>{criterion.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <small>Structured source comparison · not an instructor grade</small>
                <div className="diagnosis-grades" role="group" aria-label="Record diagnosis evidence">
                  <button type="button" className="is-primary" onClick={(event) => grade(evaluation.outcome, event)}>Use this result</button>
                  {evaluation.outcome === "success" ? <button type="button" className="is-outline" onClick={(event) => grade("partial", event)}>I needed more help</button> : null}
                  {evaluation.outcome !== "failure" ? <button type="button" className="is-ghost" onClick={(event) => grade("failure", event)}>I did not understand it</button> : null}
                </div>
              </div>
            </div>
          ) : null}
        </motion.section>
      ) : null}
      </AnimatePresence>
    </div>
    </AppShell>
  );
}
