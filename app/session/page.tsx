"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useLearner } from "@/components/LearnerProvider";
import type { Concept, RetrievalOutcome } from "@/domain/types";
import { percent } from "@/lib/format";

type Phase = "attempt" | "feedback" | "reward" | "reroute";

function SessionBody() {
  const router = useRouter();
  const search = useSearchParams();
  const reduceMotion = useReducedMotion();
  const sessionId = search.get("id");
  const { state, submit } = useLearner();
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("attempt");
  const [masteryBefore, setMasteryBefore] = useState(0);
  const [seenRouteChanges, setSeenRouteChanges] = useState(0);
  const startedAt = useRef(0);
  const conceptId = session?.plannedConceptIds[index];
  const concept = state.snapshot.concepts.find((item) => item.id === conceptId);
  const prompt = state.snapshot.prompts.find((item) => item.conceptId === conceptId);
  const total = session?.plannedConceptIds.length ?? 0;

  const before = useMemo<Concept[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem("kelus-session-before") || "[]") as Concept[]; }
    catch { return []; }
  }, []);

  if (!session || !concept || !prompt) {
    return <main className="study-shell"><p>No active route.</p><button className="cta" type="button" onClick={() => router.push("/today")}>Back to today</button></main>;
  }
  const activeSessionId = session.id;
  const plannedLength = session.plannedConceptIds.length;
  const activeConcept = concept;
  const activePrompt = prompt;

  function grade(outcome: RetrievalOutcome, event: SyntheticEvent) {
    setMasteryBefore(activeConcept.mastery);
    submit({
      conceptId: activeConcept.id,
      sessionId: activeSessionId,
      promptId: activePrompt.id,
      responseText: answer,
      outcome,
      responseTimeMs: Math.max(0, Math.round(event.timeStamp - startedAt.current)),
      answerRevealed: true,
      finish: index + 1 >= plannedLength ? { before } : undefined,
    });
    setPhase("reward");
  }

  function advance() {
    const updatedSession = state.snapshot.sessions.find((item) => item.id === activeSessionId);
    if (updatedSession && updatedSession.routeChanges.length > seenRouteChanges) {
      setSeenRouteChanges(updatedSession.routeChanges.length);
      setPhase("reroute");
      return;
    }
    if (index + 1 >= plannedLength) {
      router.push(`/session/complete?id=${activeSessionId}`);
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setPhase("attempt");
    startedAt.current = 0;
  }

  function continueAfterReroute() {
    if (index + 1 >= plannedLength) {
      router.push(`/session/complete?id=${activeSessionId}`);
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setPhase("attempt");
    startedAt.current = 0;
  }

  const routeChange = session.routeChanges.at(-1);
  const previousNames = session.initialRoute.allocations.map((allocation) => state.snapshot.concepts.find((item) => item.id === allocation.conceptId)?.name).filter(Boolean);
  const nextNames = session.latestRoute.allocations.map((allocation) => state.snapshot.concepts.find((item) => item.id === allocation.conceptId)?.name).filter(Boolean);

  return (
    <main id="main" className="study-shell">
      <header className="study-header"><span className="mark">Kelus</span><button type="button" className="text-btn" onClick={() => router.push("/today")}>Exit</button></header>
      <div className="study-progress" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total}><i style={{ transform: `scaleX(${(index + 1) / Math.max(total, 1)})` }} /></div>
      <AnimatePresence mode="wait">
        {phase === "reroute" ? (
          <motion.section key="reroute" className="reroute-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="kicker">New learning evidence</p>
            <h1>Route updated.</h1>
            <p>{routeChange?.movedConceptId ? `${state.snapshot.concepts.find((item) => item.id === routeChange.movedConceptId)?.name ?? "A concept"} moved forward.` : "The order changed."} {routeChange?.explanation}</p>
            <div className="reroute-lines" aria-label="Route before and after">
              <div><span>Previous</span>{previousNames.map((name, position) => <motion.b key={name} layout>{position + 1}. {name}</motion.b>)}</div>
              <svg viewBox="0 0 80 180" aria-hidden="true"><motion.path d="M40 5 C 6 56 72 96 40 175" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0.1 : 0.85 }} /></svg>
              <div><span>Now</span>{nextNames.map((name, position) => <motion.b key={name} layout>{position + 1}. {name}</motion.b>)}</div>
            </div>
            <button type="button" className="cta" onClick={continueAfterReroute}>Continue route <span aria-hidden="true">→</span></button>
          </motion.section>
        ) : (
          <motion.section key={`${concept.id}-${phase}`} className="study-question" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}>
            <p className="study-count">{index + 1} / {total}</p>
            <p className="kicker">{concept.name}</p>
            {phase === "attempt" ? (
              <>
                <h1>{prompt.promptText}</h1>
                <label htmlFor="answer">Retrieve before you reveal.</label>
                <textarea id="answer" autoFocus value={answer} onFocus={(event) => { if (!startedAt.current) startedAt.current = event.timeStamp; }} onChange={(event) => setAnswer(event.target.value)} />
                <button type="button" className="cta" disabled={!answer.trim()} onClick={() => setPhase("feedback")}>Continue <span aria-hidden="true">→</span></button>
              </>
            ) : null}
            {phase === "feedback" ? (
              <div className="study-feedback">
                <h1>Compare your answer.</h1>
                <p>{prompt.modelAnswer}</p>
                <h2>How well did you know this?</h2>
                <div className="study-ratings"><button type="button" onClick={(event) => grade("failure", event)}>Didn’t know</button><button type="button" onClick={(event) => grade("partial", event)}>Almost</button><button type="button" onClick={(event) => grade("success", event)}>Knew it</button></div>
              </div>
            ) : null}
            {phase === "reward" ? (
              <div className="mastery-reward">
                <p className="kicker">Estimated mastery</p>
                <div><span>{percent(masteryBefore)}</span><i aria-hidden="true">→</i><motion.strong initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{percent(concept.mastery)}</motion.strong></div>
                <p>One new piece of evidence. The estimate—not a claim of exact memory—has changed.</p>
                <button type="button" className="cta" onClick={advance}>Continue <span aria-hidden="true">→</span></button>
              </div>
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function SessionPage() {
  return <Suspense fallback={<main className="study-shell"><p>Opening route…</p></main>}><SessionBody /></Suspense>;
}
