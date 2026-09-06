"use client";

import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import { AppShell } from "@/components/AppShell";
import type { LearnerSnapshot, RetrievalOutcome, SelfRating } from "@/domain/types";
import { selectDiagnosisConcept } from "@/domain/diagnosis";

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
    () => [...concepts].sort((a, b) => b.examImportance - a.examImportance || a.name.localeCompare(b.name)).slice(0, 4),
    [concepts],
  );
  const [phase, setPhase] = useState<"rating" | "retrieval">("rating");
  const [ratings, setRatings] = useState<Record<string, SelfRating>>({});
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [selectionReason, setSelectionReason] = useState("");
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [retrievals, setRetrievals] = useState<Retrieval[]>([]);
  const startedAt = useRef(0);
  const concept = concepts.find((item) => item.id === activeConceptId);
  const prompt = snapshot.prompts.find((item) => item.conceptId === concept?.id);
  const allRated = ratedConcepts.every((item) => ratings[item.id]);

  function beginChecks(event: SyntheticEvent) {
    if (!allRated) return;
    const selected = selectDiagnosisConcept({ concepts, relationships: snapshot.relationships, ratings, evidence: [] });
    if (!selected) return onComplete({ ratings, retrievals: [] });
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
    });
    if (!selected) {
      onComplete({ ratings, retrievals: completed });
      return;
    }
    setRetrievals(completed);
    setActiveConceptId(selected.concept.id);
    setSelectionReason(selected.reason);
    setAnswer("");
    setRevealed(false);
    startedAt.current = event.timeStamp;
  }

  return (
    <AppShell>
    <div className="diagnosis-page">
      <div className="flow-context diagnosis-context"><span>Build your first route</span><b>Initial estimate</b></div>
      {phase === "rating" ? (
        <section className="diagnosis-panel">
          <p className="kicker">Start with your judgment</p>
          <h1>How familiar do these feel?</h1>
          <p className="diagnosis-intro">
            Rate the {ratedConcepts.length} most exam-critical topics. A rough answer is enough — Kelus stays uncertain until retrieval gives better evidence.
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
              {allRated ? "Check my recall" : "Rate every topic first"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      ) : concept && prompt ? (
        <section className="diagnosis-check">
          <p className="kicker">Adaptive retrieval · check {retrievals.length + 1}</p>
          <h1>{prompt.promptText}</h1>
          <p className="diagnosis-selection-reason">{selectionReason}</p>
          {!revealed ? (
            <>
              <label htmlFor="diagnosis-answer">Try without notes.</label>
              <textarea id="diagnosis-answer" autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} />
              <button type="button" className="cta" disabled={!answer.trim()} onClick={() => setRevealed(true)}>Compare answer</button>
            </>
          ) : (
            <div className="diagnosis-feedback">
              <p className="kicker">A useful answer includes</p>
              <p>{prompt.modelAnswer}</p>
              <h2>How well did you know this?</h2>
              <div className="diagnosis-grades" role="group" aria-label="How well did you know this?">
                <button type="button" className="is-ghost" onClick={(event) => grade("failure", event)}>Didn’t know</button>
                <button type="button" className="is-outline" onClick={(event) => grade("partial", event)}>Almost</button>
                <button type="button" className="is-primary" onClick={(event) => grade("success", event)}>Knew it</button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
    </AppShell>
  );
}
