"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { TodayRoute } from "@/components/TodayRoute";
import { TopicMapPanel } from "@/components/TopicMapPanel";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useLearner } from "@/components/LearnerProvider";
import { MasteryEvidence } from "@/components/MasteryEvidence";
import { daysUntilExam } from "@/domain/scheduler";
import { generateRoute } from "@/domain/routing-engine";
import { trackEvent } from "@/lib/analytics";

export type SurfaceMode = "today" | "materials" | "map";

const MODES: Array<{ id: SurfaceMode; label: string }> = [
  { id: "today", label: "Today" },
  { id: "materials", label: "Binder" },
  { id: "map", label: "Index" },
];

const MODE_ORDER: Record<SurfaceMode, number> = { today: 0, materials: 1, map: 2 };

const pressSpring = { type: "spring", bounce: 0, duration: 0.24 } as const;

function modeFromSection(section: string | null): SurfaceMode {
  if (section === "materials" || section === "map") return section;
  return "today";
}

function hrefForMode(mode: SurfaceMode) {
  return mode === "today" ? "/today" : `/today?section=${mode}`;
}

/**
 * Kelus course space — one paper column.
 * Thin top strip for section switching; content is the page.
 */
export function RevisionSurface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion() === true;
  const { state, start, reset } = useLearner();
  const [confirmReset, setConfirmReset] = useState(false);
  const mode = modeFromSection(searchParams.get("section"));
  const [direction, setDirection] = useState(1);
  const previousMode = useRef(mode);

  useEffect(() => {
    const from = previousMode.current;
    if (from !== mode) {
      setDirection(MODE_ORDER[mode] >= MODE_ORDER[from] ? 1 : -1);
      previousMode.current = mode;
    }
  }, [mode]);

  useEffect(() => {
    document.body.classList.add("is-kelus-space", "is-paper-column");
    return () => document.body.classList.remove("is-kelus-space", "is-paper-column");
  }, []);

  useEffect(() => {
    let shouldFocus = false;
    try {
      shouldFocus = sessionStorage.getItem("kelus-focus-today-start") === "1";
      if (shouldFocus) sessionStorage.removeItem("kelus-focus-today-start");
    } catch {
      shouldFocus = false;
    }
    if (!shouldFocus || mode !== "today") return;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>("button.today-start")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!course || !exam) {
    return (
      <main id="main" className="kelus-space is-empty is-paper">
        <section className="materials-empty">
          <p className="kicker">Today</p>
          <h1>Set your exam first.</h1>
          <p>Kelus needs a course and exam date before it can build today’s route.</p>
          <button type="button" className="cta" onClick={() => reset()}>
            Start over
          </button>
        </section>
      </main>
    );
  }

  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({
    concepts,
    relationships: snapshot.relationships,
    events: snapshot.events,
    exam,
    nowIso,
  });
  const days = daysUntilExam(exam, nowIso);
  const courseId = course.id;
  const examId = exam.id;
  const openSession = snapshot.sessions.find((session) => session.courseId === courseId && session.status === "in_progress");
  const modeMeta = MODES.find((item) => item.id === mode)!;

  function setMode(next: SurfaceMode) {
    if (next === mode) return;
    router.replace(hrefForMode(next), { scroll: false });
  }

  function begin() {
    const sessionId = start(courseId, examId);
    trackEvent({ name: "session_started" });
    try {
      sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    } catch {
      /* Private mode may block sessionStorage; session still starts. */
    }
    router.push(`/session?id=${sessionId}`);
  }

  function resume() {
    if (!openSession) return;
    trackEvent({ name: "session_resumed" });
    router.push(`/session?id=${openSession.id}`);
  }

  const panelTransition = reduceMotion
    ? { duration: 0.12, ease: kelusEase }
    : { type: "spring" as const, bounce: 0, duration: 0.4 };

  return (
    <section className="kelus-space is-paper" aria-label="Revision workbench">
      <header className="kelus-paper-bar">
        <div className="kelus-paper-bar-course">
          <p className="kelus-paper-course">{course.name}</p>
          <p className="kelus-paper-meta">
            Exam in {days} day{days === 1 ? "" : "s"}
          </p>
        </div>

        <nav className="kelus-paper-nav kelus-space-nav revision-surface-modes" aria-label="Revision sections">
          {MODES.map((item) => {
            const active = item.id === mode;
            return (
              <motion.button
                key={item.id}
                type="button"
                className={active ? "is-active" : undefined}
                aria-pressed={active}
                aria-label={item.label}
                onClick={() => setMode(item.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={pressSpring}
              >
                {item.label}
              </motion.button>
            );
          })}
        </nav>

        <details className="kelus-paper-more" open={confirmReset || undefined}>
          <summary>More</summary>
          {confirmReset ? (
            <span className="today-reset-confirm" role="group" aria-label="Confirm start over">
              <span>Erase this route?</span>
              <button type="button" className="text-btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="text-btn is-danger"
                onClick={() => {
                  setConfirmReset(false);
                  reset();
                }}
              >
                Start over
              </button>
            </span>
          ) : (
            <button type="button" className="text-btn" onClick={() => setConfirmReset(true)}>
              Start over
            </button>
          )}
        </details>
      </header>

      <main id="main" className="kelus-paper-page kelus-space-stage">
        <header className="kelus-paper-head kelus-space-top">
          <div className="kelus-space-identity">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={modeMeta.label}
              id="today-title"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
              transition={{ duration: reduceMotion ? 0.1 : kelusDuration.fast, ease: kelusEase }}
            >
              {modeMeta.label}
            </motion.h1>
          </AnimatePresence>
          <p className="kelus-paper-lede kelus-space-lede">
            {mode === "today"
              ? <>{route.availableMinutes} minutes today<span className="today-brief-exam"> · target {exam.targetPercent}%.</span></>
              : mode === "materials"
                ? "Pages for this exam, ready to open."
                : "Weak topics and today’s start."}
          </p>
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={mode}
            className="kelus-paper-body kelus-space-panel revision-surface-panel"
            custom={direction}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={panelTransition}
          >
            {mode === "today" ? (
              <div className="workbench-focus is-ready" aria-labelledby="today-lead-heading">
                <h2 id="today-lead-heading" className="today-workbench-heading sr-only">
                  Start here
                </h2>
                <TodayRoute
                  route={route}
                  concepts={concepts}
                  activities={snapshot.learningActivities}
                  events={snapshot.events}
                  onStart={openSession ? resume : begin}
                  startLabel={openSession ? "Resume session" : undefined}
                />
                <MasteryEvidence />
              </div>
            ) : null}
            {mode === "materials" ? <MaterialLibrary embedded /> : null}
            {mode === "map" ? <TopicMapPanel /> : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </section>
  );
}
