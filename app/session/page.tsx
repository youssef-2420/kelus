"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { evaluateLearningResponse, type AnswerEvaluation } from "@/domain/answer-evaluation";
import type { Concept, LearningActivity, RetrievalOutcome } from "@/domain/types";
import { percent } from "@/lib/format";
import { getMaterialsSnapshot, getServerMaterialsSnapshot, subscribeMaterials } from "@/lib/material-store";
import { readMaterialPdf } from "@/lib/material-sync";
import { useAuth } from "@/components/AuthProvider";
import { trackEvent } from "@/lib/analytics";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";

type Phase = "learn" | "retrieve" | "apply" | "evaluate" | "result" | "reroute";
type HelpMode = "hint" | "explain" | "example" | null;
type SourcePanelState = {
  title: string;
  locator: string | null;
  kind: "pdf" | "link" | "unavailable";
  href: string | null;
  reason?: "missing" | "read_failed";
};

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
  const { state, submit, abandon } = useLearner();
  const auth = useAuth();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const session = state.snapshot.sessions.find((item) => item.id === sessionId);
  const [index, setIndex] = useState(0);
  const [retrieveAnswer, setRetrieveAnswer] = useState("");
  const [applicationAnswer, setApplicationAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("learn");
  const [helpMode, setHelpMode] = useState<HelpMode>(null);
  const [masteryBefore, setMasteryBefore] = useState(0);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RetrievalOutcome | null>(null);
  const [routeBeforeIds, setRouteBeforeIds] = useState<string[]>([]);
  const [seenRouteChanges, setSeenRouteChanges] = useState(0);
  const [sourcePanel, setSourcePanel] = useState<SourcePanelState | null>(null);
  const [openingSource, setOpeningSource] = useState(false);
  const sourceRequest = useRef(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const sourceCloseRef = useRef<HTMLButtonElement>(null);
  const sourceOpenerRef = useRef<HTMLElement | null>(null);
  const startedAt = useRef(0);
  const responseTimeMs = useRef(0);
  const sourceObjectUrl = useRef<string | null>(null);
  const conceptId = session?.plannedConceptIds[index];
  const concept = state.snapshot.concepts.find((item) => item.id === conceptId);
  const prompt = state.snapshot.prompts.find((item) => item.conceptId === conceptId);
  const activity = state.snapshot.learningActivities?.find((item) => item.conceptId === conceptId)
    ?? (concept && prompt ? activityFallback(concept, prompt.promptText, prompt.modelAnswer) : null);
  const total = session?.plannedConceptIds.length ?? 0;
  const focusStep = useCallback((node: HTMLElement | null) => {
    if (node && phase !== "retrieve" && phase !== "apply") node.focus();
  }, [phase]);

  useEffect(() => () => {
    sourceRequest.current += 1;
    if (sourceObjectUrl.current) URL.revokeObjectURL(sourceObjectUrl.current);
  }, []);

  useEffect(() => {
    if (!sourcePanel) return;
    const previous = sourceOpenerRef.current;
    const timer = window.setTimeout(() => sourceCloseRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (sourceObjectUrl.current) {
          URL.revokeObjectURL(sourceObjectUrl.current);
          sourceObjectUrl.current = null;
        }
        setSourcePanel(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [sourcePanel]);

  const before = useMemo<Concept[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem("kelus-session-before") || "[]") as Concept[]; }
    catch { return []; }
  }, []);

  if (!session || !concept || !prompt || !activity) {
    return (
      <main id="main" className="study-shell">
        <section className="materials-empty">
          <p className="kicker">Session</p>
          <h1>No active route.</h1>
          <p>Start from Today when Kelus has a plan ready for this exam.</p>
          <button className="cta" type="button" onClick={() => router.push("/today")}>Back to today <span aria-hidden="true">→</span></button>
        </section>
      </main>
    );
  }

  const activeSessionId = session.id;
  const activeSession = session;
  const plannedLength = session.plannedConceptIds.length;
  const activeConcept = concept;
  const activePrompt = prompt;
  const activeActivity = activity;
  const routeMinutes = session.latestRoute.allocations.find((item) => item.conceptId === concept.id)?.minutes ?? concept.estimatedMinutes;
  const visibleStep = phase === "result" || phase === "reroute" ? 4 : STEP_INDEX[phase];
  const totalSteps = Math.max(total * 4, 1);
  const completedSteps = Math.min(index * 4 + visibleStep, totalSteps);

  function checkAnswers(event: SyntheticEvent) {
    responseTimeMs.current = Math.max(0, Math.round(event.timeStamp - startedAt.current));
    const nextEvaluation = evaluateLearningResponse({
      retrieveAnswer,
      applicationAnswer,
      retrieveModelAnswer: activeActivity.retrieve.modelAnswer,
      applicationModelAnswer: activeActivity.apply.modelAnswer,
      assessment: activeActivity.assessment,
    });
    setEvaluation(nextEvaluation);
    setHelpMode(null);
    setPhase("evaluate");
  }

  function grade(outcome: RetrievalOutcome) {
    setMasteryBefore(activeConcept.mastery);
    setLastOutcome(outcome);
    setRouteBeforeIds(activeSession.latestRoute.allocations.map((item) => String(item.conceptId)));
    submit({
      conceptId: activeConcept.id,
      sessionId: activeSessionId,
      promptId: activePrompt.id,
      responseText: `${retrieveAnswer}\n\nApplication: ${applicationAnswer}`,
      outcome,
      responseTimeMs: responseTimeMs.current,
      answerRevealed: true,
      finish: index + 1 >= plannedLength ? { before } : undefined,
    });
    setPhase("result");
  }

  function resetForNextConcept() {
    setIndex((value) => value + 1);
    setRetrieveAnswer("");
    setApplicationAnswer("");
    setEvaluation(null);
    setLastOutcome(null);
    setRouteBeforeIds([]);
    setHelpMode(null);
    setPhase("learn");
    startedAt.current = 0;
    responseTimeMs.current = 0;
  }

  function advance() {
    const updatedSession = state.snapshot.sessions.find((item) => item.id === activeSessionId);
    if (lastOutcome !== "success" || (updatedSession && updatedSession.routeChanges.length > seenRouteChanges)) {
      if (lastOutcome === "partial" || lastOutcome === "failure") {
        const previous = routeBeforeIds.length
          ? routeBeforeIds
          : activeSession.initialRoute.allocations.map((allocation) => String(allocation.conceptId));
        const next = updatedSession?.latestRoute.allocations.map((allocation) => String(allocation.conceptId)) ?? [];
        trackEvent({ name: "route_recalculated", changed: previous.join("|") !== next.join("|"), outcome: lastOutcome });
      }
      setSeenRouteChanges(updatedSession?.routeChanges.length ?? seenRouteChanges);
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
  const previousNames = (routeBeforeIds.length ? routeBeforeIds : session.initialRoute.allocations.map((allocation) => String(allocation.conceptId))).map((id) => state.snapshot.concepts.find((item) => item.id === id)?.name).filter(Boolean);
  const nextNames = session.latestRoute.allocations.map((allocation) => state.snapshot.concepts.find((item) => item.id === allocation.conceptId)?.name).filter(Boolean);
  const routeOrderChanged = previousNames.join("|") !== nextNames.join("|");
  const helpCopy = helpMode === "hint" ? activity.retrieve.hint : helpMode === "explain" ? activity.retrieve.explanation : helpMode === "example" ? activity.retrieve.example : null;

  async function openSource(materialId: string, locator: string | null) {
    sourceOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const material = materials.find((item) => item.id === materialId);
    if (sourceObjectUrl.current) {
      URL.revokeObjectURL(sourceObjectUrl.current);
      sourceObjectUrl.current = null;
    }
    if (!material) {
      setSourcePanel({ title: "Course source", locator, kind: "unavailable", href: null, reason: "missing" });
      return;
    }
    if (material.storage === "url" && material.sourceUrl) {
      setSourcePanel({ title: material.title, locator, kind: "link", href: material.sourceUrl });
      return;
    }
    const request = ++sourceRequest.current;
    setOpeningSource(true);
    let blob: Blob | null = null;
    let readFailed = false;
    try {
      blob = await readMaterialPdf(materialId, auth.user?.id);
    } catch {
      readFailed = true;
    } finally {
      if (request === sourceRequest.current) setOpeningSource(false);
    }
    if (request !== sourceRequest.current) return;
    if (!blob) {
      setSourcePanel({
        title: material.title,
        locator,
        kind: "unavailable",
        href: null,
        reason: readFailed ? "read_failed" : "missing",
      });
      return;
    }
    const page = Number(locator?.match(/\d+/)?.[0] ?? 1);
    const objectUrl = URL.createObjectURL(blob);
    sourceObjectUrl.current = objectUrl;
    setSourcePanel({ title: material.title, locator, kind: "pdf", href: `${objectUrl}#page=${page}` });
  }

  function closeSource() {
    if (sourceObjectUrl.current) {
      URL.revokeObjectURL(sourceObjectUrl.current);
      sourceObjectUrl.current = null;
    }
    setSourcePanel(null);
  }

  return (
    <main id="main" className={`study-shell${sourcePanel ? " is-source-open" : ""}`}>
      <div className="study-context">
        <span><b>{concept.name}</b><small>{routeMinutes} min</small></span>
        {confirmExit ? (
          <span className="today-reset-confirm" role="group" aria-label="Confirm exit session">
            <span>Leave this session?</span>
            <button type="button" className="text-btn" onClick={() => setConfirmExit(false)}>Stay</button>
            <button type="button" className="text-btn is-danger" onClick={() => {
              trackEvent({ name: "session_abandoned" });
              abandon(session.id);
              router.push("/today");
            }}>Exit</button>
          </span>
        ) : (
          <button type="button" className="text-btn" onClick={() => setConfirmExit(true)}>Exit session</button>
        )}
      </div>
      <div className="study-progress" role="progressbar" aria-label="Session progress" aria-valuenow={completedSteps} aria-valuemin={0} aria-valuemax={totalSteps} aria-valuetext={`Concept ${index + 1} of ${total}, step ${visibleStep} of 4`}><i style={{ transform: `scaleX(${completedSteps / totalSteps})` }} /></div>
      <div className="study-wayfinding">
        <span>Topic {index + 1} of {total}</span>
        <ol aria-label="Revision steps">{(["learn", "retrieve", "apply", "evaluate"] as const).map((step) => <li key={step} aria-current={visibleStep === STEP_INDEX[step] ? "step" : undefined}>{step === "retrieve" ? "Recall" : step === "evaluate" ? "Check" : step[0].toUpperCase() + step.slice(1)}</li>)}</ol>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "reroute" ? (
          <motion.section ref={focusStep} tabIndex={-1} key="reroute" className="reroute-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="polite">
            <p className="kicker">New learning evidence</p>
            <h1>{routeOrderChanged ? "Route updated." : "Route checked."}</h1>
            <p>
              {routeOrderChanged
                ? `${routeChange?.movedConceptId ? `${state.snapshot.concepts.find((item) => item.id === routeChange.movedConceptId)?.name ?? "A concept"} moved forward. ` : ""}${routeChange?.explanation ?? "Your latest answer changed the best order for the remaining time."}`
                : `Your ${lastOutcome === "failure" ? "not-yet" : "partial"} answer changed the learner estimate. The remaining order still has the highest expected value, so Kelus kept it.`}
            </p>
            <div className="reroute-cause" aria-label="How this answer affected the route">
              <div><span>Your answer</span><strong>{evaluation?.label ?? (lastOutcome === "failure" ? "Not enough evidence yet" : "Partial evidence")}</strong></div>
              <i aria-hidden="true">→</i>
              <div><span>Learner estimate</span><strong>{percent(masteryBefore)} → {percent(activeConcept.mastery)}</strong></div>
              <i aria-hidden="true">→</i>
              <div><span>Next route</span><strong>{routeOrderChanged ? "Order changed" : "Order kept"}</strong></div>
            </div>
            <div className="reroute-lines" aria-label="Route before and after">
              <div><span>Previous</span>{previousNames.map((name, position) => <motion.b key={name} layout>{position + 1}. {name}</motion.b>)}</div>
              <svg viewBox="0 0 80 180" aria-hidden="true"><motion.path d="M40 5 C 6 56 72 96 40 175" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0.1 : 0.85 }} /></svg>
              <div><span>Now</span>{nextNames.map((name, position) => <motion.b key={name} layout>{position + 1}. {name}</motion.b>)}</div>
            </div>
            <button type="button" className="cta" onClick={continueAfterReroute}>Continue route <span aria-hidden="true">→</span></button>
          </motion.section>
        ) : phase === "result" ? (
          <motion.section ref={focusStep} tabIndex={-1} key={`${concept.id}-result`} className="study-question" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="study-count" aria-live="polite">04 / 04 · Evaluated</p>
            <p className="kicker">Learner model updated</p>
            <div className="mastery-reward">
              <div><span>{percent(masteryBefore)}</span><i aria-hidden="true">→</i><motion.strong initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{percent(concept.mastery)}</motion.strong></div>
              <p>One new piece of evidence changed the estimate. Kelus will now reconsider what belongs next.</p>
              <button type="button" className="cta" onClick={advance}>Continue <span aria-hidden="true">→</span></button>
            </div>
          </motion.section>
        ) : (
          <motion.section ref={focusStep} tabIndex={-1} key={`${concept.id}-${phase}`} className="study-question" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0.1 : 0.24 }}>
            <p className="study-count" aria-live="polite">{String(visibleStep).padStart(2, "0")} / 04 · {phase}</p>

            {phase === "learn" ? (
              <div className="session-learn">
                <p className="kicker">{concept.name}</p>
                <h1>{activity.learn.title}</h1>
                <p className="session-explanation">{activity.learn.explanation}</p>
                <ul>{activity.learn.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                {activity.sourceReferences.length ? (
                  <div className="session-sources" aria-label="Course sources">
                    <span>From your course</span>
                    {activity.sourceReferences.map((reference) => (
                      <button key={`${reference.materialId}-${reference.locator}`} type="button" disabled={openingSource} onClick={() => void openSource(reference.materialId, reference.locator)}>
                        {reference.label}{reference.locator ? ` · ${reference.locator}` : ""} <span aria-hidden="true">↗</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="session-source-note">Demo course model · No uploaded source cited</p>}
                {openingSource ? <p role="status" className="session-source-note">Opening your source…</p> : null}
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
                <button type="button" className="text-btn study-back" onClick={() => { setHelpMode(null); setPhase("learn"); }}>Back to explanation</button>
              </>
            ) : null}

            {phase === "apply" ? (
              <>
                <p className="kicker">Apply</p>
                <h1>{activity.apply.prompt}</h1>
                <label htmlFor="application-answer">Use the idea in a different situation.</label>
                <textarea id="application-answer" autoFocus value={applicationAnswer} onChange={(event) => setApplicationAnswer(event.target.value)} placeholder="Work through the new case…" />
                <div className="session-apply-hint"><button type="button" onClick={() => setHelpMode(helpMode === "hint" ? null : "hint")} aria-expanded={helpMode === "hint"}>Need a hint?</button>{helpMode === "hint" ? <p>{activity.apply.hint}</p> : null}</div>
                <button type="button" className="cta" disabled={!applicationAnswer.trim()} onClick={checkAnswers}>Check my thinking <span aria-hidden="true">→</span></button>
                <button type="button" className="text-btn study-back" onClick={() => { setHelpMode(null); setPhase("retrieve"); }}>Edit recall answer</button>
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
                {evaluation ? (
                  <div className={`answer-evaluation is-${evaluation.outcome}`} role="status">
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
                    <div className="study-ratings" role="group" aria-label="Record answer evidence">
                      <button type="button" className="is-primary" onClick={() => grade(evaluation.outcome)}>Use this result</button>
                      {evaluation.outcome === "success" ? <button type="button" className="is-outline" onClick={() => grade("partial")}>I needed more help</button> : null}
                      {evaluation.outcome !== "failure" ? <button type="button" className="is-ghost" onClick={() => grade("failure")}>I did not understand it</button> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {sourcePanel ? (
          <motion.aside
            key={`${sourcePanel.title}-${sourcePanel.locator}`}
            className="session-source-panel"
            role="dialog"
            aria-modal="false"
            aria-label={`Course source: ${sourcePanel.title}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            transition={{ duration: reduceMotion ? kelusDuration.micro : kelusDuration.moderate, ease: kelusEase }}
          >
            <header>
              <div><span>From your course</span><strong>{sourcePanel.title}</strong>{sourcePanel.locator ? <small>{sourcePanel.locator}</small> : null}</div>
              <button ref={sourceCloseRef} type="button" onClick={closeSource} aria-label="Close course source">Close</button>
            </header>
            {sourcePanel.kind === "pdf" && sourcePanel.href ? <iframe title={`${sourcePanel.title} ${sourcePanel.locator ?? ""}`} src={sourcePanel.href} /> : null}
            {sourcePanel.kind === "link" && sourcePanel.href ? (
              <div className="session-source-link">
                <p>This source is saved as a web link. Open it when you need the original context; your session stays here.</p>
                <a href={sourcePanel.href} target="_blank" rel="noreferrer">Open original source <span aria-hidden="true">↗</span></a>
              </div>
            ) : null}
            {sourcePanel.kind === "unavailable" ? (
              <div className="session-source-link">
                <p>
                  {sourcePanel.reason === "read_failed"
                    ? "Kelus could not open this PDF just now. Your session stays here — add the file again from Materials, then reopen the source."
                    : "The reference is part of your learning activity, but the original file is not available on this device."}
                </p>
                <button type="button" onClick={() => router.push("/materials")}>Add the PDF again <span aria-hidden="true">→</span></button>
              </div>
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export default function SessionPage() {
  return (
    <LateralPage>
      <Suspense
        fallback={
          <SuspenseFallbackExit>
            <main id="main" className="study-shell"><p>Opening route…</p></main>
          </SuspenseFallbackExit>
        }
      >
        <SuspenseReveal>
          <SessionBody />
        </SuspenseReveal>
      </Suspense>
    </LateralPage>
  );
}
