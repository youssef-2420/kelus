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

const PHASE_LABEL: Record<"learn" | "retrieve" | "apply" | "evaluate", string> = {
  learn: "Read",
  retrieve: "Retrieve",
  apply: "Use",
  evaluate: "Mark",
};

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
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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

  useEffect(() => {
    document.body.classList.add("is-session-booklet");
    return () => document.body.classList.remove("is-session-booklet");
  }, []);

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
        <section className="materials-empty is-session-empty">
          <p className="kicker">Session</p>
          <h1>No active revision yet.</h1>
          <p>Sessions open from Today’s route. Each block walks one topic through the same loop:</p>
          <ol className="session-empty-preview" aria-label="Revision loop preview">
            <li>
              <strong>Read</strong>
              <span>Short explanation from your course</span>
            </li>
            <li>
              <strong>Retrieve</strong>
              <span>Write it without looking</span>
            </li>
            <li>
              <strong>Use</strong>
              <span>Try it on a fresh prompt</span>
            </li>
            <li>
              <strong>Mark</strong>
              <span>Then Kelus updates the route</span>
            </li>
          </ol>
          <div className="materials-empty-actions">
            <button className="cta" type="button" onClick={() => router.replace("/today")}>
              Open today’s route <span aria-hidden="true">→</span>
            </button>
          </div>
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
  const folioPhase =
    phase === "result"
      ? "Mark"
      : phase === "reroute"
        ? "Route"
        : PHASE_LABEL[phase as "learn" | "retrieve" | "apply" | "evaluate"];

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
      <div className="study-context is-folio">
        <span>
          <small>
            {index + 1} of {total} · {folioPhase}
          </small>
        </span>
        <div className="study-folio-actions">
          <details className="study-more" open={confirmDiscard || undefined}>
            <summary aria-label="More session options">More</summary>
            {confirmDiscard ? (
              <span className="today-reset-confirm study-discard" role="group" aria-label="Confirm discard block">
                <span>Discard this block?</span>
                <button type="button" className="text-btn" onClick={() => setConfirmDiscard(false)}>Keep</button>
                <button
                  type="button"
                  className="text-btn is-danger"
                  onClick={() => {
                    trackEvent({ name: "session_abandoned" });
                    abandon(session.id);
                    router.push("/today");
                  }}
                >
                  Discard
                </button>
              </span>
            ) : (
              <button type="button" className="text-btn study-discard-trigger" onClick={() => setConfirmDiscard(true)}>
                Discard block
              </button>
            )}
          </details>
          <button
            type="button"
            className="text-btn study-close"
            title="Return to Today — your place is kept"
            onClick={() => router.push("/today")}
          >
            Close
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "reroute" ? (
          <motion.section
            ref={focusStep}
            tabIndex={-1}
            key="reroute"
            className="reroute-view is-page study-reroute-moment"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5 }}
            aria-live="polite"
          >
            <motion.p
              className="study-mark-kicker"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.35, delay: reduceMotion ? 0 : 0.04, ease: kelusEase }}
            >
              Route
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.55, delay: 0.06 }}
            >
              {routeOrderChanged ? "Updated." : "Kept."}
            </motion.h1>
            <motion.p
              className="study-reroute-lede"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5, delay: 0.1 }}
            >
              {routeOrderChanged
                ? `${routeChange?.movedConceptId ? `${state.snapshot.concepts.find((item) => item.id === routeChange.movedConceptId)?.name ?? "A topic"} moved earlier. ` : ""}${routeChange?.explanation ?? "Your answer changed what to practise next with the time you have."}`
                : lastOutcome === "failure"
                  ? "That answer was thin, so the estimate moved — but this order is still the best use of the time left."
                  : "Part of it landed. The estimate moved, and this order is still the strongest path for what’s left."}
            </motion.p>
            {routeOrderChanged && routeChange?.movedConceptId ? (
              <motion.p
                className="study-reroute-moved"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.4, delay: reduceMotion ? 0 : 0.14, ease: kelusEase }}
              >
                Next up{" "}
                <strong>
                  {state.snapshot.concepts.find((item) => item.id === routeChange.movedConceptId)?.name ?? "a concept"}
                </strong>
              </motion.p>
            ) : null}
            <motion.p
              className="reroute-whisper"
              aria-label="How this answer affected the route"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.4, delay: reduceMotion ? 0 : 0.16, ease: kelusEase }}
            >
              <span className="study-mark-from">{percent(masteryBefore)}</span>
              <span className="study-mark-arrow" aria-hidden="true"> → </span>
              <span className={`study-mark-to${activeConcept.mastery < masteryBefore ? " is-down" : ""}`}>
                {percent(activeConcept.mastery)}
              </span>
              <span className="study-reroute-sep"> · </span>
              {evaluation?.label ?? (lastOutcome === "failure" ? "Still shaky" : "Partly there")}
              <span className="study-reroute-sep"> · </span>
              {routeOrderChanged ? "New order" : "Same order"}
            </motion.p>
            <motion.button
              type="button"
              className="cta"
              onClick={continueAfterReroute}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
            >
              Continue <span aria-hidden="true">→</span>
            </motion.button>
          </motion.section>
        ) : phase === "result" ? (
          <motion.section
            ref={focusStep}
            tabIndex={-1}
            key={`${concept.id}-result`}
            className="study-question is-page study-mark-moment"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5 }}
          >
            <p className="study-count sr-only" aria-live="polite">Marked</p>
            <motion.p
              className="study-mark-kicker"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.35, delay: reduceMotion ? 0 : 0.04, ease: kelusEase }}
            >
              Mark
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.55, delay: 0.06 }}
            >
              Marked.
            </motion.h1>
            <motion.p
              className="study-mark-delta"
              aria-live="polite"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5, delay: 0.12 }}
            >
              <span className="study-mark-from">{percent(masteryBefore)}</span>
              <span className="study-mark-arrow" aria-hidden="true">→</span>
              <span className="study-mark-to">{percent(concept.mastery)}</span>
            </motion.p>
            <motion.p
              className="study-mark-whisper"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.4, delay: reduceMotion ? 0 : 0.18, ease: kelusEase }}
            >
              {concept.name} is noted. Next comes from what’s left.
            </motion.p>
            <motion.button
              type="button"
              className="cta"
              onClick={advance}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
            >
              Continue <span aria-hidden="true">→</span>
            </motion.button>
          </motion.section>
        ) : (
          <motion.section
            ref={focusStep}
            tabIndex={-1}
            key={`${concept.id}-${phase}`}
            className="study-question is-page"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : phase === "learn" || phase === "retrieve" || phase === "apply"
                  ? { opacity: 0, y: 12 }
                  : { opacity: 0, x: 28 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : phase === "learn" || phase === "retrieve" || phase === "apply"
                  ? { opacity: 0, y: -8 }
                  : { opacity: 0, x: -16 }
            }
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.45 }}
          >
            <p className="study-count sr-only" aria-live="polite">{PHASE_LABEL[phase as "learn" | "retrieve" | "apply" | "evaluate"]}</p>

            {phase === "learn" ? (
              <div className="session-learn">
                <h1>{activity.learn.title}</h1>
                <p className="session-explanation">{activity.learn.explanation}</p>
                <ul>{activity.learn.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                {activity.sourceReferences.length ? (
                  <div className="session-sources" aria-label="Course sources">
                    <span>Source</span>
                    {activity.sourceReferences.map((reference) => {
                      const locator = reference.locator?.trim();
                      const showLocator = locator && !/not your upload|demo/i.test(locator);
                      return (
                      <button key={`${reference.materialId}-${reference.locator}`} type="button" disabled={openingSource} onClick={() => void openSource(reference.materialId, reference.locator)}>
                        {reference.label}{showLocator ? ` · ${locator}` : ""} <span aria-hidden="true">↗</span>
                      </button>
                      );
                    })}
                  </div>
                ) : <p className="session-source-note">Sample course model</p>}
                {openingSource ? <p role="status" className="session-source-note">Opening your source…</p> : null}
                <motion.button
                  type="button"
                  className="cta"
                  onClick={() => { setPhase("retrieve"); startedAt.current = performance.now(); }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                >
                  Retrieve it <span aria-hidden="true">→</span>
                </motion.button>
              </div>
            ) : null}

            {phase === "retrieve" ? (
              <div className="session-work is-retrieve">
                <p className="study-mark-kicker">Retrieve</p>
                <h1>{activity.retrieve.prompt}</h1>
                <label className="session-work-lede" htmlFor="retrieve-answer">
                  Close the page. Write it in your own words.
                </label>
                <textarea
                  id="retrieve-answer"
                  className="session-work-field"
                  autoFocus
                  value={retrieveAnswer}
                  onChange={(event) => setRetrieveAnswer(event.target.value)}
                  placeholder="From memory…"
                  rows={6}
                />
                <details
                  className="session-help-page"
                  open={helpMode ? true : undefined}
                  onToggle={(event) => {
                    if (!(event.target as HTMLDetailsElement).open) setHelpMode(null);
                  }}
                >
                  <summary>Need a hint?</summary>
                  <div className="session-help-choices" role="group" aria-label="Help options">
                    <button type="button" className={helpMode === "hint" ? "is-active" : undefined} onClick={() => setHelpMode(helpMode === "hint" ? null : "hint")}>Hint</button>
                    <button type="button" className={helpMode === "explain" ? "is-active" : undefined} onClick={() => setHelpMode(helpMode === "explain" ? null : "explain")}>Explain</button>
                    <button type="button" className={helpMode === "example" ? "is-active" : undefined} onClick={() => setHelpMode(helpMode === "example" ? null : "example")}>Example</button>
                  </div>
                  <AnimatePresence mode="wait">{helpCopy ? <motion.p key={helpMode} initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{helpCopy}</motion.p> : null}</AnimatePresence>
                </details>
                <div className="session-work-actions">
                  <motion.button
                    type="button"
                    className="cta"
                    disabled={!retrieveAnswer.trim()}
                    onClick={() => { setHelpMode(null); setPhase("apply"); }}
                    whileTap={reduceMotion || !retrieveAnswer.trim() ? undefined : { scale: 0.97 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                  >
                    Continue <span aria-hidden="true">→</span>
                  </motion.button>
                  <button type="button" className="text-btn study-back" onClick={() => { setHelpMode(null); setPhase("learn"); }}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {phase === "apply" ? (
              <div className="session-work is-apply">
                <p className="study-mark-kicker">Use</p>
                <h1>{activity.apply.prompt}</h1>
                <label className="session-work-lede" htmlFor="application-answer">
                  Same idea, new situation.
                </label>
                <textarea
                  id="application-answer"
                  className="session-work-field"
                  autoFocus
                  value={applicationAnswer}
                  onChange={(event) => setApplicationAnswer(event.target.value)}
                  placeholder="Work the new case…"
                  rows={6}
                />
                <details className="session-help-page" open={helpMode === "hint" || undefined}>
                  <summary>Need a hint?</summary>
                  <p>{activity.apply.hint}</p>
                </details>
                <div className="session-work-actions">
                  <motion.button
                    type="button"
                    className="cta"
                    disabled={!applicationAnswer.trim()}
                    onClick={checkAnswers}
                    whileTap={reduceMotion || !applicationAnswer.trim() ? undefined : { scale: 0.97 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                  >
                    Check my thinking <span aria-hidden="true">→</span>
                  </motion.button>
                  <button type="button" className="text-btn study-back" onClick={() => { setHelpMode(null); setPhase("retrieve"); }}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {phase === "evaluate" ? (
              <div className="study-feedback is-page is-mark-folio">
                <h1>Mark.</h1>
                <p className="study-mark-lede">Set your answers beside the model, then record what stuck.</p>
                <div className="answer-pages" aria-label="Compare your answers">
                  <section>
                    <span>Your retrieval</span>
                    <p>{retrieveAnswer}</p>
                  </section>
                  <section>
                    <span>Key idea</span>
                    <p>{activity.retrieve.modelAnswer}</p>
                  </section>
                  <section>
                    <span>Your application</span>
                    <p>{applicationAnswer}</p>
                  </section>
                  <section>
                    <span>A sound application</span>
                    <p>{activity.apply.modelAnswer}</p>
                  </section>
                </div>
                {evaluation ? (
                  <div className={`answer-evaluation is-page is-${evaluation.outcome}`} role="status">
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
                    <small>Compared with the source · not a grade</small>
                    <div className="study-ratings" role="group" aria-label="Record answer evidence">
                      <motion.button
                        type="button"
                        className="is-primary"
                        onClick={() => grade(evaluation.outcome)}
                        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                      >
                        Mark this
                      </motion.button>
                      {evaluation.outcome === "success" ? (
                        <button type="button" className="is-outline" onClick={() => grade("partial")}>
                          I needed more help
                        </button>
                      ) : null}
                      {evaluation.outcome !== "failure" ? (
                        <button type="button" className="is-ghost" onClick={() => grade("failure")}>
                          I did not understand it
                        </button>
                      ) : null}
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
