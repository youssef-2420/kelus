"use client";

import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { evaluateDiagnosisResponse, type AnswerEvaluation } from "@/domain/answer-evaluation";
import { DIAGNOSIS_RETRIEVAL_LIMIT } from "@/domain/constants";
import type { LearnerSnapshot, RetrievalOutcome, SelfRating } from "@/domain/types";
import { selectDiagnosisConcept } from "@/domain/diagnosis";
import { trackEvent } from "@/lib/analytics";

const RATINGS: Array<{ value: SelfRating; label: string }> = [
  { value: "dont_know", label: "Don’t know" },
  { value: "weak", label: "Weak" },
  { value: "okay", label: "Okay" },
  { value: "strong", label: "Strong" },
];

type Retrieval = { conceptId: string; promptId: string; responseText: string; outcome: RetrievalOutcome; responseTimeMs: number };

export function InitialDiagnosis({ snapshot, onComplete }: {
  snapshot: LearnerSnapshot;
  onComplete: (input: { ratings: Record<string, SelfRating>; retrievals: Retrieval[] }) => void;
}) {
  const concepts = snapshot.concepts;
  const ratedConcepts = useMemo(
    () => [...concepts].sort((a, b) => b.examImportance - a.examImportance || a.name.localeCompare(b.name)).slice(0, 3),
    [concepts],
  );
  const [phase, setPhase] = useState<"rating" | "retrieval">("rating");
  const [ratings, setRatings] = useState<Record<string, SelfRating>>({});
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [selectionReason, setSelectionReason] = useState("");
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [retrievals, setRetrievals] = useState<Retrieval[]>([]);
  const startedAt = useRef(0);
  const concept = concepts.find((item) => item.id === activeConceptId);
  const prompt = snapshot.prompts.find((item) => item.conceptId === concept?.id);
  const activity = snapshot.learningActivities.find((item) => item.conceptId === concept?.id);
  const allRated = ratedConcepts.every((item) => ratings[item.id]);

  function beginChecks(event: SyntheticEvent) {
    if (!allRated) return;
    const selected = selectDiagnosisConcept({ concepts, relationships: snapshot.relationships, ratings, evidence: [], maximumChecks: DIAGNOSIS_RETRIEVAL_LIMIT });
    if (!selected) {
      trackEvent({ name: "diagnosis_completed", retrieval_count: 0 });
      return onComplete({ ratings, retrievals: [] });
    }
    setActiveConceptId(selected.concept.id);
    setSelectionReason(selected.reason);
    startedAt.current = event.timeStamp;
    setPhase("retrieval");
  }

  function grade(outcome: RetrievalOutcome, event: SyntheticEvent) {
    if (!concept || !prompt) return;
    const completed = [...retrievals, {
      conceptId: concept.id,
      promptId: prompt.id,
      responseText: answer,
      outcome,
      responseTimeMs: Math.max(0, Math.round(event.timeStamp - startedAt.current)),
    }];
    const selected = selectDiagnosisConcept({
      concepts,
      relationships: snapshot.relationships,
      ratings,
      evidence: completed.map((item) => ({ conceptId: item.conceptId, outcome: item.outcome })),
      maximumChecks: DIAGNOSIS_RETRIEVAL_LIMIT,
    });
    if (!selected) {
      trackEvent({ name: "diagnosis_completed", retrieval_count: completed.length });
      onComplete({ ratings, retrievals: completed });
      return;
    }
    setRetrievals(completed);
    setActiveConceptId(selected.concept.id);
    setSelectionReason(selected.reason);
    setAnswer("");
    setRevealed(false);
    setEvaluation(null);
    startedAt.current = event.timeStamp;
  }

  function compareAnswer() {
    if (!prompt) return;
    setEvaluation(evaluateDiagnosisResponse({ answer, modelAnswer: prompt.modelAnswer, assessment: activity?.assessment }));
    setRevealed(true);
  }

  return (
    <AppShell>
    <div className="diagnosis-page">
      <div className="flow-context diagnosis-context"><span>One quick evidence check · then today’s first stop</span><b>Initial estimate</b></div>
      {phase === "rating" ? (
        <section className="diagnosis-panel">
          <p className="kicker">Start with your judgment</p>
          <h1>How familiar do these feel?</h1>
          <p className="diagnosis-intro">
            Rate the {ratedConcepts.length} most exam-critical topics, then complete one source-backed recall check. Rough answers are enough — then Kelus opens today’s first study stop.
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
                        onClick={() => setRatings({ ...ratings, [item.id]: rating.value })}
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
          </div>
        </section>
      ) : concept && prompt ? (
        <section className="diagnosis-check">
          <p className="kicker">Recall check {retrievals.length + 1} of {DIAGNOSIS_RETRIEVAL_LIMIT}</p>
          <h1>{prompt.promptText}</h1>
          <p className="diagnosis-selection-reason">{selectionReason}</p>
          {!revealed ? (
            <>
              <label htmlFor="diagnosis-answer">Try without notes.</label>
              <textarea id="diagnosis-answer" autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} />
              <button type="button" className="cta" disabled={!answer.trim()} onClick={compareAnswer}>Compare answer</button>
            </>
          ) : (
            <div className="diagnosis-feedback">
              <p className="kicker">A useful answer includes</p>
              <p>{prompt.modelAnswer}</p>
              {evaluation ? (
                <div className={`diagnosis-evaluation is-${evaluation.outcome}`} role="status">
                  <p className="kicker">Kelus evidence check</p>
                  <h2>{evaluation.label}</h2>
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
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
    </AppShell>
  );
}
