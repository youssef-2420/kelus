"use client";

import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import type { LearnerSnapshot, RetrievalOutcome, SelfRating } from "@/domain/types";

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
  const checks = useMemo(() => [...concepts].sort((a, b) => b.examImportance - a.examImportance).slice(0, 2), [concepts]);
  const [phase, setPhase] = useState<"rating" | "retrieval">("rating");
  const [ratings, setRatings] = useState<Record<string, SelfRating>>({});
  const [checkIndex, setCheckIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [retrievals, setRetrievals] = useState<Retrieval[]>([]);
  const startedAt = useRef(0);
  const concept = checks[checkIndex];
  const prompt = snapshot.prompts.find((item) => item.conceptId === concept?.id);
  const allRated = concepts.every((item) => ratings[item.id]);

  function beginChecks(event: SyntheticEvent) {
    if (!allRated) return;
    startedAt.current = event.timeStamp;
    setPhase("retrieval");
  }

  function grade(outcome: RetrievalOutcome, event: SyntheticEvent) {
    if (!concept || !prompt) return;
    const next = [...retrievals, {
      conceptId: concept.id,
      promptId: prompt.id,
      responseText: answer,
      outcome,
      responseTimeMs: Math.max(0, Math.round(event.timeStamp - startedAt.current)),
    }];
    if (checkIndex + 1 >= checks.length) {
      onComplete({ ratings, retrievals: next });
      return;
    }
    setRetrievals(next);
    setCheckIndex((value) => value + 1);
    setAnswer("");
    setRevealed(false);
    startedAt.current = event.timeStamp;
  }

  return (
    <main id="main" className="diagnosis-page">
      <div className="flow-context diagnosis-context"><span>Build your first route</span><b>Initial estimate</b></div>
      {phase === "rating" ? (
        <section className="diagnosis-panel">
          <p className="kicker">Start with your judgment</p>
          <h1>How familiar do these feel?</h1>
          <p className="diagnosis-intro">A rough answer is enough. Kelus will stay uncertain until your retrieval gives it better evidence.</p>
          <ol className="diagnosis-list">
            {concepts.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <div role="group" aria-label={`Familiarity with ${item.name}`}>
                  {RATINGS.map((rating) => (
                    <button key={rating.value} type="button" className={ratings[item.id] === rating.value ? "is-selected" : undefined} onClick={() => setRatings({ ...ratings, [item.id]: rating.value })}>{rating.label}</button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="cta diagnosis-continue" disabled={!allRated} onClick={beginChecks}>Check my recall <span aria-hidden="true">→</span></button>
        </section>
      ) : concept && prompt ? (
        <section className="diagnosis-check">
          <p className="kicker">Quick retrieval · {checkIndex + 1} of {checks.length}</p>
          <h1>{prompt.promptText}</h1>
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
              <div className="diagnosis-grades">
                <button type="button" onClick={(event) => grade("failure", event)}>Didn’t know</button>
                <button type="button" onClick={(event) => grade("partial", event)}>Almost</button>
                <button type="button" onClick={(event) => grade("success", event)}>Knew it</button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
