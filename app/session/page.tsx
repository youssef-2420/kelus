"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useLearner } from "@/components/LearnerProvider";
import type { Concept, LearningActivity, RetrievalOutcome } from "@/domain/types";
import { percent } from "@/lib/format";

type Phase = "learn" | "retrieve" | "apply" | "evaluate" | "result" | "reroute";
type HelpMode = "hint" | "explain" | "example" | null;

const STEP_INDEX = { learn: 1, retrieve: 2, apply: 3, evaluate: 4 } as const;

function activityFallback(concept: Concept, promptText: string, modelAnswer: string): LearningActivity {
  return {
    id: `activity-${concept.id}`,
    conceptId: concept.id,
    learn: {
      title: `Build a usable explanation of ${concept.name}.`,
      explanation: modelAnswer,
      keyPoints: ["Read for the relationship between cause and result.", "Then close the explanation and retrieve it in your own words."],
    },
    retrieve: {
      prompt: promptText,
      hint: "Name the central relationship before adding detail.",
      explanation: modelAnswer,
      example: "Connect the concept to a concrete case from your course.",
      modelAnswer,
    },
    apply: {
      prompt: `Give one new example that correctly uses ${concept.name}.`,
      hint: "Change the context, but keep the same underlying relationship.",
      modelAnswer: `A strong example should name ${concept.name} and correctly connect its cause to its result.`,
    },
    sourceReferences: [],
  };
}

function SessionBody() {
  const router = useRouter();
  const search = useSearchParams();
  const reduceMotion = useReducedMotion();
  const sessionId = search.get("id");
  const { state, submit } = useLearner();
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  const [index, setIndex] = useState(0);
  const [retrieveAnswer, setRetrieveAnswer] = useState("");
  const [applicationAnswer, setApplicationAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("learn");
  const [helpMode, setHelpMode] = useState<HelpMode>(null);
  const [masteryBefore, setMasteryBefore] = useState(0);
  const [seenRouteChanges, setSeenRouteChanges] = useState(0);
  const startedAt = useRef(0);
  const conceptId = session?.plannedConceptIds[index];
  const concept = state.snapshot.concepts.find((item) => item.id === conceptId);
  const prompt = state.snapshot.prompts.find((item) => item.conceptId === conceptId);
  const activity = state.snapshot.learningActivities?.find((item) => item.conceptId === conceptId)
    ?? (concept && prompt ? activityFallback(concept, prompt.promptText, prompt.modelAnswer) : null);
  const total = session?.plannedConceptIds.length ?? 0;

  const before = useMemo<Concept[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem("kelus-session-before") || "[]") as Concept[]; }
    catch { return []; }
  }, []);

  if (!session || !concept || !prompt || !activity) {
    return <main id="main" className="study-shell"><p>No active route.</p><button className="cta" type="button" onClick={() => router.push("/today")}>Back to today</button></main>;
  }

  const activeSessionId = session.id;
  const plannedLength = session.plannedConceptIds.length;
  const activeConcept = concept;
  const activePrompt = prompt;
  const routeMinutes = session.latestRoute.allocations.find((item) => item.conceptId === concept.id)?.minutes ?? concept.estimatedMinutes;
  const visibleStep = phase === "result" || phase === "reroute" ? 4 : STEP_INDEX[phase];
  const totalSteps = Math.max(total * 4, 1);
  const completedSteps = Math.min(index * 4 + visibleStep, totalSteps);

  function grade(outcome: RetrievalOutcome, event: SyntheticEvent) {
    setMasteryBefore(activeConcept.mastery);
    submit({
      conceptId: activeConcept.id,
      sessionId: activeSessionId,
      promptId: activePrompt.id,
      responseText: `${retrieveAnswer}\n\nApplication: ${applicationAnswer}`,
      outcome,
      responseTimeMs: Math.max(0, Math.round(event.timeStamp - startedAt.current)),
      answerRevealed: true,
      finish: index + 1 >= plannedLength ? { before } : undefined,
    });
    setPhase("result");
  }

  function resetForNextConcept() {
    setIndex((value) => value + 1);
    setRetrieveAnswer("");
    setApplicationAnswer("");
    setHelpMode(null);
    setPhase("learn");
    startedAt.current = 0;
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
    resetForNextConcept();
  }

  function continueAfterReroute() {
    if (index + 1 >= plannedLength) {
      router.push(`/session/complete?id=${activeSessionId}`);
      return;
    }
    resetForNextConcept();
  }

  const routeChange = session.routeChanges.at(-1);
  const previousNames = session.initialRoute.allocations.map((allocation) => state.snapshot.concepts.find((item) => item.id === allocation.conceptId)?.name).filter(Boolean);
  const nextNames = session.latestRoute.allocations.map((allocation) => state.snapshot.concepts.find((item) => item.id === allocation.conceptId)?.name).filter(Boolean);
  const helpCopy = helpMode === "hint" ? activity.retrieve.hint : helpMode === "explain" ? activity.retrieve.explanation : helpMode === "example" ? activity.retrieve.example : null;

  return (
    <main id="main" className="study-shell">
      <div className="study-context">
        <span><b>{concept.name}</b><small>{routeMinutes} min</small></span>
        <button type="button" className="text-btn" onClick={() => router.push("/today")}>Exit session</button>
      </div>
      <div className="study-progress" role="progressbar" aria-label="Session progress" aria-valuenow={completedSteps} aria-valuemin={0} aria-valuemax={totalSteps}><i style={{ transform: `scaleX(${completedSteps / totalSteps})` }} /></div>

      <AnimatePresence mode="wait" initial={false}>
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
        ) : phase === "result" ? (
          <motion.section key={`${concept.id}-result`} className="study-question" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="study-count">04 / 04 · Evaluated</p>
            <p className="kicker">Learner model updated</p>
            <div className="mastery-reward">
              <div><span>{percent(masteryBefore)}</span><i aria-hidden="true">→</i><motion.strong initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{percent(concept.mastery)}</motion.strong></div>
              <p>One new piece of evidence changed the estimate. Kelus will now reconsider what belongs next.</p>
              <button type="button" className="cta" onClick={advance}>Continue <span aria-hidden="true">→</span></button>
            </div>
          </motion.section>
        ) : (
          <motion.section key={`${concept.id}-${phase}`} className="study-question" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0.1 : 0.24 }}>
            <p className="study-count">{String(visibleStep).padStart(2, "0")} / 04 · {phase}</p>

            {phase === "learn" ? (
              <div className="session-learn">
                <p className="kicker">{concept.name}</p>
                <h1>{activity.learn.title}</h1>
                <p className="session-explanation">{activity.learn.explanation}</p>
                <ul>{activity.learn.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                <p className="session-source-note">Demo course model · No uploaded source cited</p>
                <button type="button" className="cta" onClick={() => { setPhase("retrieve"); startedAt.current = performance.now(); }}>Retrieve it <span aria-hidden="true">→</span></button>
              </div>
            ) : null}

            {phase === "retrieve" ? (
              <>
                <p className="kicker">Retrieve</p>
                <h1>{activity.retrieve.prompt}</h1>
                <label htmlFor="retrieve-answer">Write from memory before checking the explanation.</label>
                <textarea id="retrieve-answer" autoFocus value={retrieveAnswer} onChange={(event) => setRetrieveAnswer(event.target.value)} placeholder="Explain it in your own words…" />
                <div className="session-help">
                  <span>Need help?</span>
                  <div>
                    <button type="button" aria-pressed={helpMode === "hint"} onClick={() => setHelpMode(helpMode === "hint" ? null : "hint")}>Hint</button>
                    <button type="button" aria-pressed={helpMode === "explain"} onClick={() => setHelpMode(helpMode === "explain" ? null : "explain")}>Explain this</button>
                    <button type="button" aria-pressed={helpMode === "example"} onClick={() => setHelpMode(helpMode === "example" ? null : "example")}>Show an example</button>
                  </div>
                  <AnimatePresence mode="wait">{helpCopy ? <motion.p key={helpMode} initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{helpCopy}</motion.p> : null}</AnimatePresence>
                </div>
                <button type="button" className="cta" disabled={!retrieveAnswer.trim()} onClick={() => { setHelpMode(null); setPhase("apply"); }}>Continue <span aria-hidden="true">→</span></button>
              </>
            ) : null}

            {phase === "apply" ? (
              <>
                <p className="kicker">Apply</p>
                <h1>{activity.apply.prompt}</h1>
                <label htmlFor="application-answer">Use the idea in a different situation.</label>
                <textarea id="application-answer" autoFocus value={applicationAnswer} onChange={(event) => setApplicationAnswer(event.target.value)} placeholder="Work through the new case…" />
                <div className="session-apply-hint"><button type="button" onClick={() => setHelpMode(helpMode === "hint" ? null : "hint")} aria-expanded={helpMode === "hint"}>Need a hint?</button>{helpMode === "hint" ? <p>{activity.apply.hint}</p> : null}</div>
                <button type="button" className="cta" disabled={!applicationAnswer.trim()} onClick={() => { setHelpMode(null); setPhase("evaluate"); }}>Check my thinking <span aria-hidden="true">→</span></button>
              </>
            ) : null}

            {phase === "evaluate" ? (
              <div className="study-feedback">
                <div className="kicker">Evaluate</div>
                <h1>Compare the reasoning.</h1>
                <div className="answer-comparison">
                  <section><span>Your retrieval</span><p>{retrieveAnswer}</p></section>
                  <section><span>Key idea</span><p>{activity.retrieve.modelAnswer}</p></section>
                  <section><span>Your application</span><p>{applicationAnswer}</p></section>
                  <section><span>A sound application</span><p>{activity.apply.modelAnswer}</p></section>
                </div>
                <h2>How independently could you explain and apply it?</h2>
                <div className="study-ratings"><button type="button" onClick={(event) => grade("failure", event)}>Not yet</button><button type="button" onClick={(event) => grade("partial", event)}>Almost</button><button type="button" onClick={(event) => grade("success", event)}>I can use it</button></div>
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
