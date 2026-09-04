"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import type { RetrievalOutcome } from "@/domain/types";

function SessionBody() {
  const router = useRouter();
  const search = useSearchParams();
  const sessionId = search.get("id");
  const { state, submit } = useLearner();
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const conceptId = session?.plannedConceptIds[index];
  const concept = state.snapshot.concepts.find((item) => item.id === conceptId);
  const prompt = state.snapshot.prompts.find((item) => item.conceptId === conceptId);
  const total = session?.plannedConceptIds.length ?? 0;

  const before = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("kelus-session-before") || "[]");
    } catch {
      return [];
    }
  }, []);

  if (!session || !concept || !prompt) {
    return (
      <AppShell>
        <p>No active session.</p>
        <p><button type="button" className="cta" onClick={() => router.push("/today")}>Back to today</button></p>
      </AppShell>
    );
  }

  function finishOrNext() {
    if (!session) return;
    if (index + 1 >= session.plannedConceptIds.length) {
      router.push(`/session/complete?id=${session.id}`);
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setRevealed(false);
  }

  function grade(outcome: RetrievalOutcome) {
    if (!session || !concept || !prompt) return;
    const last = index + 1 >= session.plannedConceptIds.length;
    submit({
      conceptId: concept.id,
      sessionId: session.id,
      promptId: prompt.id,
      responseText: answer,
      outcome,
      finish: last ? { before } : undefined,
    });
    finishOrNext();
  }

  const progress = ((index + (revealed ? 0.5 : 0)) / Math.max(total, 1)) * 100;

  return (
    <AppShell action={<span className="quiet">{index + 1} of {total}</span>}>
      <div
        className="session-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((index / Math.max(total, 1)) * 100)}
        aria-label={`Question ${index + 1} of ${total}`}
      >
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="prompt">
        <p className="kicker quiet">{concept.name}</p>
        <h1>{prompt.promptText}</h1>
        {!revealed ? (
          <>
            <label htmlFor="answer" className="quiet">Your answer</label>
            <textarea id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} />
            <p className="session-actions">
              <button type="button" className="cta" onClick={() => setRevealed(true)}>Reveal answer</button>
            </p>
          </>
        ) : (
          <div className="reveal">
            <p className="quiet">Answer</p>
            <p>{prompt.modelAnswer}</p>
            <p className="grade-prompt">How well did you know this?</p>
            <div className="rates">
              <button type="button" className="cta" onClick={() => grade("success")}>Knew it</button>
              <button type="button" className="ghost" onClick={() => grade("partial")}>Mostly</button>
              <button type="button" className="ghost" onClick={() => grade("failure")}>Didn’t know</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SessionPage() {
  return <Suspense fallback={<AppShell><p>Opening session…</p></AppShell>}><SessionBody /></Suspense>;
}
