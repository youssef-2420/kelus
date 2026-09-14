"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { TodayRoute } from "@/components/TodayRoute";
import { TopicMapPanel } from "@/components/TopicMapPanel";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { generateRoute } from "@/domain/routing-engine";
import { greeting } from "@/lib/format";
import { lastSessionCompletedAt } from "@/lib/demo-store";
import { trackEvent } from "@/lib/analytics";

export type SurfaceMode = "today" | "materials" | "map";

const MODES: Array<{ id: SurfaceMode; href: string; label: string }> = [
  { id: "today", href: "/today", label: "Today" },
  { id: "materials", href: "/materials", label: "Materials" },
  { id: "map", href: "/map", label: "Map" },
];

/**
 * One revision section: Today / Materials / Map as modes of the same booklet surface.
 * Routes stay for deep links + tests; the experience does not feel like three apps.
 */
export function RevisionSurface({ mode }: { mode: SurfaceMode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion() === true;
  const { state, start, reset } = useLearner();
  const [confirmReset, setConfirmReset] = useState(false);

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!course || !exam) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Today</p>
          <h1>Set your exam first.</h1>
          <p>Kelus needs a course and exam date before it can build today’s route.</p>
          <button type="button" className="cta" onClick={() => reset()}>
            Start over
          </button>
        </section>
      </AppShell>
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
  const lastCompleted = lastSessionCompletedAt();
  const dueCount = concepts.filter((concept) => concept.nextReviewAt && Date.parse(concept.nextReviewAt) <= Date.parse(nowIso)).length;
  const returning = Boolean(lastCompleted) && snapshot.sessions.some((session) => session.status === "complete");

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

  return (
    <AppShell
      action={
        confirmReset ? (
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
        )
      }
    >
      <section className="revision-surface is-ready" aria-label="Revision workbench">
        <header className="revision-surface-head">
          <div className="revision-surface-brief">
            <p className="kicker">Revision</p>
            <h1 id="today-title">{course.name}</h1>
            <p className="revision-surface-lede">
              {route.availableMinutes} minutes for revision today
              <span className="today-brief-exam">
                {" "}
                · Exam in {days} days · target {exam.targetPercent}%.
              </span>
              {returning ? (
                <span className="today-welcome">
                  {" "}
                  {greeting(nowIso)}. Welcome back
                  {dueCount > 0 ? ` · ${dueCount} concept${dueCount === 1 ? "" : "s"} due` : ""}.
                </span>
              ) : null}
            </p>
            <p className="today-readiness-hint" id="today-readiness-hint">
              Est. readiness is from your ratings and recall checks — not a grade prediction.
            </p>
          </div>

          <nav className="revision-surface-modes" aria-label="Revision sections">
            {MODES.map((item) => {
              const active = item.id === mode;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            className="revision-surface-panel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0.12 : kelusDuration.moderate, ease: kelusEase }}
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
              </div>
            ) : null}
            {mode === "materials" ? <MaterialLibrary embedded /> : null}
            {mode === "map" ? <TopicMapPanel /> : null}
          </motion.div>
        </AnimatePresence>
      </section>
    </AppShell>
  );
}
