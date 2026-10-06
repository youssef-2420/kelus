"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { evaluateLearningResponse, type AnswerEvaluation } from "@/domain/answer-evaluation";
import { resumeSessionIndex } from "@/domain/session-engine";
import type { Concept, LearningActivity, RetrievalOutcome, RouteAllocation } from "@/domain/types";
import { getMaterialsSnapshot, getServerMaterialsSnapshot, subscribeMaterials } from "@/lib/material-store";
import { readMaterialPdf } from "@/lib/material-sync";
import { useAuth } from "@/components/AuthProvider";
import { KelusLogoMark } from "@/components/KelusLogoMark";
import { LoopSteps } from "@/components/LoopSteps";
import { MarkStamp } from "@/components/MarkStamp";
import { MinuteShift, RouteShift } from "@/components/RouteShift";
import { PracticeDrill } from "@/components/PracticeDrill";
import { NotesSection } from "@/components/NotesSection";
import { markdownToPages } from "@/domain/markdown-pages";
import type { ExtractedMaterialPage } from "@/domain/types";
import { QuickRun, type QuickRunResult } from "@/components/QuickRun";
import { buildQuickRun, quickOutcome, quickSummary } from "@/domain/quick-run";
import { aiActive, fetchAiTopicContent } from "@/lib/ai-client";
import { mergeAiContent, type AiTopicContent } from "@/domain/ai-content";
import { CourseSourceReader } from "@/components/CourseSourceReader";
import { trackEvent } from "@/lib/analytics";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";

type Phase = "learn" | "retrieve" | "apply" | "evaluate" | "result" | "reroute";
type HelpMode = "hint" | "explain" | null;
type SourcePanelState = {
  title: string;
  locator: string | null;
  kind: "pdf" | "notes" | "link" | "unavailable";
  href: string | null;
  section?: ExtractedMaterialPage | null;
  reason?: "missing" | "read_failed" | "built_in";
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
  const [position, setPosition] = useState<{ sessionId: string; index: number } | null>(null);
  const index = position && session && position.sessionId === session.id
    ? position.index
    : session ? resumeSessionIndex(session, state.snapshot.events) : 0;
  const [retrieveAnswer, setRetrieveAnswer] = useState("");
  const [applicationAnswer, setApplicationAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("learn");
  const [helpMode, setHelpMode] = useState<HelpMode>(null);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RetrievalOutcome | null>(null);
  const [routeBeforeIds, setRouteBeforeIds] = useState<string[]>([]);
  const [routeBeforeAllocations, setRouteBeforeAllocations] = useState<RouteAllocation[]>([]);
  const [sourcePanel, setSourcePanel] = useState<SourcePanelState | null>(null);
  const [openingSource, setOpeningSource] = useState(false);
  const [sourceRevealed, setSourceRevealed] = useState(false);
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
  const baseActivity = state.snapshot.learningActivities?.find((item) => item.conceptId === conceptId)
    ?? (concept && prompt ? activityFallback(concept, prompt.promptText, prompt.modelAnswer) : null);
  // Optional, opt-in: questions written from this topic's page. Any failure leaves the offline questions in place.
  const [ai, setAi] = useState<{ id: string; content: AiTopicContent | null } | null>(null);
  useEffect(() => {
    const pageText = baseActivity?.teach?.pageText;
    if (!concept || !pageText || !aiActive()) return;
    let live = true;
    void fetchAiTopicContent({
      name: concept.name,
      locator: baseActivity?.sourceReferences[0]?.locator ?? "this page",
      pageText,
      otherTopics: state.snapshot.concepts.filter((item) => item.id !== concept.id).map((item) => item.name),
    }).then((content) => { if (live) setAi({ id: concept.id, content }); });
    return () => { live = false; };
    // Re-run only when the topic changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptId]);
  const activity = baseActivity && ai && ai.id === conceptId ? mergeAiContent(baseActivity, ai.content) : baseActivity;
  const siblingNames = state.snapshot.concepts.filter((item) => item.courseId === concept?.courseId).map((item) => item.name);
  // Fixed when the topic opens, so finishing a run does not reshuffle it under the learner.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const round = useMemo(() => concept?.retrievalAttempts ?? 0, [conceptId]);
  const run = useMemo(
    () => (activity && concept ? buildQuickRun({ activity, name: concept.name, siblingNames, round }) : null),
    // The run is rebuilt only when the topic or its content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conceptId, round, activity?.practice?.length, activity?.teach?.aiExplanation],
  );
  const quickMode = Boolean(run);
  const [runKey, setRunKey] = useState(0);
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
          <LoopSteps />
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

  function grade(outcome: RetrievalOutcome, texts?: { retrieve: string; application: string }) {
    // Hold the current page while the recorded event moves the resumable index forward.
    setPosition({ sessionId: activeSessionId, index });
    setLastOutcome(outcome);
    setRouteBeforeIds(activeSession.latestRoute.allocations.map((item) => String(item.conceptId)));
    setRouteBeforeAllocations(activeSession.latestRoute.allocations);
    submit({
      conceptId: activeConcept.id,
      sessionId: activeSessionId,
      promptId: activePrompt.id,
      responseText: `${texts?.retrieve ?? retrieveAnswer}\n\nApplication: ${texts?.application ?? applicationAnswer}`,
      outcome,
      responseTimeMs: responseTimeMs.current,
      answerRevealed: true,
      finish: index + 1 >= plannedLength ? { before } : undefined,
    });
    setPhase("result");
  }

  function resetForNextConcept() {
    setPosition({ sessionId: activeSessionId, index: index + 1 });
    setRetrieveAnswer("");
    setApplicationAnswer("");
    setEvaluation(null);
    setLastOutcome(null);
    setRouteBeforeIds([]);
    setRouteBeforeAllocations([]);
    setHelpMode(null);
    setSourceRevealed(false);
    setPhase("learn");
    startedAt.current = 0;
    responseTimeMs.current = 0;
  }

  function finishQuick(result: QuickRunResult) {
    const outcome = quickOutcome(result);
    const summary = quickSummary(result);
    setRetrieveAnswer(result.explained);
    setApplicationAnswer(summary);
    responseTimeMs.current = result.elapsedMs;
    setEvaluation({
      outcome,
      score: result.total ? result.right / result.total : 0,
      label: outcome === "success" ? "Strong evidence" : outcome === "partial" ? "Partial evidence" : "Not enough evidence yet",
      explanation: summary,
      matchedRetrieve: 0,
      matchedApply: 0,
      criteria: [],
      contradiction: false,
    });
    grade(outcome, { retrieve: result.explained, application: summary });
  }

  function retryCurrentConcept() {
    if (quickMode) {
      setRetrieveAnswer("");
      setApplicationAnswer("");
      setEvaluation(null);
      setHelpMode(null);
      setSourceRevealed(false);
      setRunKey((value) => value + 1);
      setPhase("learn");
      startedAt.current = performance.now();
      return;
    }
    setRetrieveAnswer("");
    setApplicationAnswer("");
    setEvaluation(null);
    setHelpMode(null);
    setSourceRevealed(false);
    setPhase("retrieve");
    startedAt.current = performance.now();
  }

  function advance() {
    const updatedSession = state.snapshot.sessions.find((item) => item.id === activeSessionId);
    if (routeChanged) {
      if (lastOutcome === "partial" || lastOutcome === "failure") {
        const previous = routeBeforeIds.length
          ? routeBeforeIds
          : activeSession.initialRoute.allocations.map((allocation) => String(allocation.conceptId));
        const next = updatedSession?.latestRoute.allocations.map((allocation) => String(allocation.conceptId)) ?? [];
        trackEvent({ name: "route_recalculated", changed: routeChanged || previous.join("|") !== next.join("|"), outcome: lastOutcome });
      }
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

  const completedIds = new Set(state.snapshot.events.filter((event) => event.sessionId === session.id && event.kind === "retrieval").map((event) => event.conceptId));
  const previousRemaining = routeBeforeIds.filter((id) => id !== "mixed-retrieval" && !completedIds.has(id) && session.plannedConceptIds.includes(id));
  const nextRemaining = session.plannedConceptIds.filter((id) => !completedIds.has(id));
  const routeOrderChanged = routeBeforeIds.length > 0 && previousRemaining.join("|") !== nextRemaining.join("|");
  const previousMinutes = new Map(routeBeforeAllocations.map((allocation) => [allocation.conceptId, allocation.minutes]));
  const minuteChanges = session.latestRoute.allocations
    .filter((allocation) => allocation.conceptId !== "mixed-retrieval" && nextRemaining.includes(allocation.conceptId) && previousMinutes.has(allocation.conceptId) && previousMinutes.get(allocation.conceptId) !== allocation.minutes)
    .map((allocation) => ({
      name: state.snapshot.concepts.find((item) => item.id === allocation.conceptId)?.name ?? "Topic",
      before: previousMinutes.get(allocation.conceptId)!,
      after: allocation.minutes,
    }));
  const routeChanged = routeOrderChanged || minuteChanges.length > 0;
  const nextConceptName = state.snapshot.concepts.find((item) => item.id === session.plannedConceptIds[index + 1])?.name;
  const checkCount = state.snapshot.events.filter((event) => event.conceptId === concept.id && event.kind === "retrieval").length;
  const helpCopy = helpMode === "hint" ? activity.retrieve.hint : helpMode === "explain" ? activity.retrieve.explanation : null;
  const currentSource = activity.sourceReferences[0];
  const currentMaterial = materials.find((item) => item.id === currentSource?.materialId)
    ?? (currentSource?.materialId === "demo-syllabus-microeconomics" ? materials.find((item) => item.id === "material-demo-microeconomics") : null)
    ?? materials.find((item) => item.courseId === concept.courseId && item.storage === "local")
    ?? null;
  const hasReadableSource = currentMaterial?.storage === "local" && !currentMaterial.id.startsWith("material-demo-");
  const sourcePage = Number(currentSource?.locator?.match(/\d+/)?.[0] ?? 1);
  const recallWithoutLooking = ((["retrieve", "apply"] as Phase[]).includes(phase) || (quickMode && phase === "learn")) && !sourceRevealed;

  async function openSource(materialId: string, locator: string | null) {
    sourceOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const material = materials.find((item) => item.id === materialId)
      ?? (materialId === "demo-syllabus-microeconomics" ? materials.find((item) => item.id === "material-demo-microeconomics") : null);
    if (sourceObjectUrl.current) {
      URL.revokeObjectURL(sourceObjectUrl.current);
      sourceObjectUrl.current = null;
    }
    if (!material) {
      setSourcePanel({ title: "Course source", locator, kind: "unavailable", href: null, reason: "missing" });
      return;
    }
    if (material.id.startsWith("material-demo-")) {
      setSourcePanel({ title: material.title, locator, kind: "unavailable", href: null, reason: "built_in" });
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
    if (material.kind === "text") {
      const sections = markdownToPages(await blob.text());
      setSourcePanel({ title: material.title, locator, kind: "notes", href: null, section: sections[Math.min(Math.max(page, 1), sections.length) - 1] ?? null });
      return;
    }
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
    <main id="main" data-phase={phase} className={`study-shell${sourcePanel ? " is-source-open" : ""}${hasReadableSource ? "" : " is-source-missing"}${recallWithoutLooking && hasReadableSource ? " is-recalling" : ""}${quickMode && recallWithoutLooking ? " is-focus" : ""}`}>
      <div className="study-context is-folio">
        <span className="study-context-title">
          <Link href="/" className="study-brand" aria-label="Kelus home"><KelusLogoMark /><span>kelus</span></Link>
          <small>Topic {index + 1} of {total} · {concept.name}</small>
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
      <aside className="session-workspace-rail" aria-label="Course workspace">
        <p>Your course</p>
        <strong>{state.snapshot.courses.find((item) => item.id === concept.courseId)?.name ?? "Course"}</strong>
        <nav aria-label="Workspace sections">
          <Link href="/today">Study plan</Link>
          <Link href="/today?section=materials">Materials</Link>
          <Link href="/today?section=map">Topics</Link>
        </nav>
        <div className="session-rail-topic"><span>Now studying</span><b>{concept.name}</b><small>{index + 1} of {total} topics</small></div>
      </aside>
      {hasReadableSource ? <div className="session-workspace-source">
        <CourseSourceReader key={`${currentMaterial.id}-${sourcePage}`} material={currentMaterial} initialPage={sourcePage} concealed={recallWithoutLooking} onShowSource={() => setSourceRevealed(true)} />
      </div> : null}
      <div className="study-loop-track">
        {quickMode ? (
          <p className="study-run-label">{concept.name} · topic {index + 1} of {total}{recallWithoutLooking && hasReadableSource ? <> · <button type="button" className="text-btn study-peek" onClick={() => setSourceRevealed(true)}>Peek at the notes</button></> : null}</p>
        ) : (
          <LoopSteps
            compact
            label="Study steps"
            current={(["read", "retrieve", "use", "mark"] as const)[phase === "result" || phase === "reroute" ? 3 : (["learn", "retrieve", "apply", "evaluate"] as const).indexOf(phase)]}
          />
        )}
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
              Updated.
            </motion.h1>
            <motion.p
              className="study-reroute-lede"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5, delay: 0.1 }}
            >
              {routeOrderChanged ? "The remaining topic order changed." : "The topic order stayed; the time plan changed."} {nextConceptName ? `${nextConceptName} is next.` : "You have reached the end of this block."}
            </motion.p>
            {nextConceptName ? (
              <motion.p
                className="study-reroute-moved"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.4, delay: reduceMotion ? 0 : 0.14, ease: kelusEase }}
              >
                Next up{" "}
                <strong>
                  {nextConceptName}
                </strong>
              </motion.p>
            ) : null}
            {routeOrderChanged ? (
              <RouteShift
                before={previousRemaining.map((id) => ({ id, name: state.snapshot.concepts.find((item) => item.id === id)?.name ?? "Topic" }))}
                after={nextRemaining.map((id) => ({ id, name: state.snapshot.concepts.find((item) => item.id === id)?.name ?? "Topic" }))}
              />
            ) : null}
            {minuteChanges.length ? <MinuteShift changes={minuteChanges.slice(0, 3)} /> : null}
            <p className="reroute-whisper" aria-label="How this answer affected the route">{evaluation?.label ?? "New evidence"} · {routeOrderChanged ? "Order updated" : "Time updated"}</p>
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
            {lastOutcome ? <MarkStamp outcome={lastOutcome} /> : null}
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
              {lastOutcome === "success" ? "Solid pass." : lastOutcome === "partial" ? "Partly there." : "Needs another attempt."}
            </motion.h1>
            <motion.p
              className="study-mark-summary"
              aria-live="polite"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5, delay: 0.12 }}
            >
              {concept.name} · {checkCount === 1 ? "first check" : `${checkCount} checks`}
            </motion.p>
            <motion.p
              className="study-mark-whisper"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.4, delay: reduceMotion ? 0 : 0.18, ease: kelusEase }}
            >
              {lastOutcome === "success" ? "You used the idea in your own words." : `Return to the source idea: ${activity.retrieve.modelAnswer}`}
            </motion.p>
            <p className="study-reroute-lede" role="status">
              {routeOrderChanged ? "The remaining topic order changed. " : minuteChanges.length ? "The topic order stayed, but the time plan changed. " : "The remaining route is unchanged. "}
              {nextConceptName ? `${nextConceptName} is next.` : "This is the last topic in this block."}
            </p>
            <div className="session-value-proof" aria-label="What changed in this session">
              <div>
                <span>This check</span>
                <strong>{evaluation?.label ?? (lastOutcome === "failure" ? "Needs another pass" : "Partial evidence")}</strong>
              </div>
              <div>
                <span>Your next choice</span>
                <strong>{lastOutcome === "success" ? `Continue${nextConceptName ? ` to ${nextConceptName}` : " to your summary"}.` : `Try ${concept.name} again now, or continue${nextConceptName ? ` to ${nextConceptName}` : " to your summary"}.`}</strong>
              </div>
              {minuteChanges.length ? <div><span>Time adjusted</span><strong>{minuteChanges.slice(0, 2).map((change) => `${change.name} ${change.before} → ${change.after} min`).join(" · ")}</strong></div> : null}
            </div>
            {quickMode ? null : <PracticeDrill key={concept.id} items={activity.practice ?? []} />}
            {currentSource && currentMaterial ? (
              <button
                type="button"
                className="text-btn session-source-return"
                onClick={() => void openSource(currentSource.materialId, currentSource.locator)}
              >
                Review the source behind this topic <span aria-hidden="true">↗</span>
              </button>
            ) : null}
            <div className="study-result-actions">
              {lastOutcome !== "success" ? <motion.button type="button" className="cta" onClick={retryCurrentConcept} whileTap={reduceMotion ? undefined : { scale: 0.97 }} transition={{ type: "spring", bounce: 0, duration: 0.28 }}>Try again <span aria-hidden="true">↻</span></motion.button> : null}
              <button type="button" className={lastOutcome === "success" ? "cta" : "text-btn"} onClick={advance}>{nextConceptName ? `Continue to ${nextConceptName}` : "Finish block"} <span aria-hidden="true">→</span></button>
            </div>
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

            {phase === "learn" && quickMode && run ? (
              <QuickRun key={`${concept.id}-${runKey}`} run={run} onRevealSource={() => setSourceRevealed(true)} onFinish={finishQuick} />
            ) : null}

            {phase === "learn" && !quickMode ? (
              <div className="session-learn">
                <h1>{activity.learn.title}</h1>
                <p className="session-explanation">{activity.learn.explanation}</p>
                {activity.teach?.aiExplanation ? <p className="session-ai-explanation"><span>In plain words</span>{activity.teach.aiExplanation}</p> : null}
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
                ) : null}
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
                  Use the idea to explain this question.
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
                {currentSource && currentMaterial ? <button type="button" className="text-btn session-source-compare" onClick={() => void openSource(currentSource.materialId, currentSource.locator)}>View original page · {currentSource.locator ?? "source"} <span aria-hidden="true">↗</span></button> : null}
                {evaluation ? (
                  <motion.div
                    className={`answer-evaluation is-page is-${evaluation.outcome}`}
                    role="status"
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.5, ease: kelusEase }}
                  >
                    <h2>{evaluation.label}</h2>
                    <p>{evaluation.explanation}</p>
                    {evaluation.criteria.length ? (
                      <ul className="answer-criteria" aria-label="Assessment criteria">
                        {evaluation.criteria.map((criterion, criterionIndex) => (
                          <motion.li
                            key={criterion.id}
                            className={criterion.met ? "is-met" : "is-missing"}
                            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.75 + criterionIndex * 0.14, ease: kelusEase }}
                          >
                            <span aria-hidden="true">{criterion.met ? "✓" : "○"}</span>{criterion.label}
                          </motion.li>
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
                  </motion.div>
                ) : null}
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
              <div><span>{sourcePanel.reason === "built_in" ? "Built-in example" : "From your course"}</span><strong>{sourcePanel.title}</strong>{sourcePanel.locator && sourcePanel.reason !== "built_in" ? <small>{sourcePanel.locator}</small> : null}</div>
              <button ref={sourceCloseRef} type="button" onClick={closeSource} aria-label="Close course source">Close</button>
            </header>
            {sourcePanel.kind === "notes" && sourcePanel.section ? <div className="session-source-notes"><NotesSection page={sourcePanel.section} title={sourcePanel.title} /></div> : null}
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
                  {sourcePanel.reason === "built_in"
                    ? "This is a practice example, not a document you uploaded. Add your own PDF in Materials to study with page references."
                    : sourcePanel.reason === "read_failed"
                    ? "Kelus could not open this PDF just now. Your session stays here — add the file again from Materials, then reopen the source."
                    : "The reference is part of your learning activity, but the original file is not available on this device."}
                </p>
                <button type="button" onClick={() => router.push("/materials")}>{sourcePanel.reason === "built_in" ? "Add your own material" : "Add the PDF again"} <span aria-hidden="true">→</span></button>
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
