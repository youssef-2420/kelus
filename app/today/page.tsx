"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { InitialDiagnosis } from "@/components/InitialDiagnosis";
import { TodayRoute } from "@/components/TodayRoute";
import { useLearner } from "@/components/LearnerProvider";
import { trackEvent } from "@/lib/analytics";
import { daysUntilExam } from "@/domain/scheduler";
import { estimatedReadiness } from "@/domain/readiness";
import { generateRoute } from "@/domain/routing-engine";
import { greeting } from "@/lib/format";
import { lastSessionCompletedAt } from "@/lib/demo-store";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";

function TodayBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, start, reset, completeSetup, completeDiagnosis, useDemo: loadDemo } = useLearner();
  const [confirmReset, setConfirmReset] = useState(false);
  const sampleHandled = useRef(false);
  const wantsSample = searchParams.get("sample") === "1";
  const sampleBooting = wantsSample && !state.onboardingCompleted;

  useEffect(() => {
    if (!wantsSample) return;
    if (sampleHandled.current) return;
    sampleHandled.current = true;
    const alreadyReady = state.onboardingCompleted && state.snapshot.concepts.length > 0;
    if (!alreadyReady) {
      loadDemo();
      trackEvent({ name: "sample_loaded", source: "today_query" });
    }
    router.replace("/today");
  }, [wantsSample, state.onboardingCompleted, state.snapshot.concepts.length, loadDemo, router]);

  function finishDiagnosis(input: Parameters<typeof completeDiagnosis>[0]) {
    completeDiagnosis(input);
    let elapsedMs = 0;
    try {
      const startedAt = Number(window.localStorage.getItem("kelus-first-route-started-at"));
      elapsedMs = startedAt > 0 ? Math.max(0, Date.now() - startedAt) : 0;
      window.localStorage.removeItem("kelus-first-route-started-at");
    } catch {
      elapsedMs = 0;
    }
    trackEvent({ name: "first_route_ready", elapsed_ms: elapsedMs, concept_count: state.snapshot.concepts.length });
  }

  if (sampleBooting) {
    return (
      <main id="main" className="destination-page">
        <p className="destination-brand">Kelus</p>
        <h1 className="destination-page-title">Loading sample…</h1>
        <p>Opening a finished course model so you can see Today in about a minute.</p>
      </main>
    );
  }

  if (!state.onboardingCompleted) {
    return (
      <FirstRunSetup
        onComplete={(input) => {
          try { window.localStorage.setItem("kelus-first-route-started-at", String(Date.now())); } catch { /* Timing analytics are optional. */ }
          completeSetup(input);
          router.push("/materials");
        }}
        onUseDemo={loadDemo}
      />
    );
  }

  if (!state.snapshot.concepts.length) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Materials</p>
          <h1>Bring in one real source.</h1>
          <p>Add a syllabus or lecture PDF, then confirm the concepts Kelus should route through.</p>
          <div className="materials-empty-actions">
            <button type="button" className="cta" onClick={() => loadDemo()}>
              Try sample (~1 min) <span aria-hidden="true">→</span>
            </button>
            <Link className="text-btn" href="/materials">
              Add course material <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  if (!state.diagnosisCompleted) {
    return <InitialDiagnosis snapshot={state.snapshot} onComplete={finishDiagnosis} />;
  }

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
          <button type="button" className="cta" onClick={() => reset()}>Start over</button>
        </section>
      </AppShell>
    );
  }

  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({ concepts, relationships: snapshot.relationships, events: snapshot.events, exam, nowIso });
  const readiness = estimatedReadiness(concepts);
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

  function requestReset() {
    setConfirmReset(true);
  }

  function confirmStartOver() {
    setConfirmReset(false);
    reset();
  }

  return (
    <AppShell
      action={
        confirmReset ? (
          <span className="today-reset-confirm" role="group" aria-label="Confirm start over">
            <span>Erase this route?</span>
            <button type="button" className="text-btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button type="button" className="text-btn is-danger" onClick={confirmStartOver}>Start over</button>
          </span>
        ) : (
          <button type="button" className="text-btn" onClick={requestReset}>Start over</button>
        )
      }
    >
      <section className="today-brief is-revision-studio" aria-labelledby="today-title">
        <div className="today-brief-copy">
          <p className="kicker">Today · {course.name}</p>
          <h1 id="today-title">Today’s route</h1>
          {returning ? (
            <p className="today-welcome">
              {greeting(nowIso)}. Welcome back
              {dueCount > 0 ? ` · ${dueCount} concept${dueCount === 1 ? "" : "s"} due for review` : ""}.
            </p>
          ) : null}
          <p>
            {route.availableMinutes} minutes for revision today. Start with one topic.
          </p>
        </div>
        <details className="today-exam-details">
        <summary>Exam in {days} days <span>View target and readiness</span></summary>
        <dl className="today-context is-equal" aria-label="Current study context">
          <div>
            <dt>Exam</dt>
            <dd>{days} days</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{exam.targetPercent}%</dd>
          </div>
          <div className="today-readiness">
            <dt>
              <span id="today-readiness-label">Est. readiness</span>
            </dt>
            <dd
              aria-labelledby="today-readiness-label"
              aria-describedby="today-readiness-hint"
              title="Estimate from your familiarity ratings and recall checks — not a grade prediction."
            >
              {Math.round(readiness * 100)}%
            </dd>
            <p className="today-readiness-hint" id="today-readiness-hint">
              Estimate from your ratings and recall checks — not a grade prediction.
            </p>
          </div>
        </dl>
        </details>
      </section>

      <section className="today-workbench is-revision-studio" aria-labelledby="route-title">
        <div className="today-workbench-heading">
          <h2 id="route-title" className="kicker">Your next study block</h2>
        </div>
        <TodayRoute
          route={route}
          concepts={concepts}
          activities={snapshot.learningActivities}
          events={snapshot.events}
          onStart={openSession ? resume : begin}
          startLabel={openSession ? "Resume session" : undefined}
        />
      </section>
    </AppShell>
  );
}

export default function TodayPage() {
  return (
    <LateralPage>
      <Suspense
        fallback={
          <SuspenseFallbackExit>
            <main id="main" className="destination-page">
          <p className="destination-brand">Kelus</p>
          <h1 className="destination-page-title">Opening Today…</h1>
        </main>
          </SuspenseFallbackExit>
        }
      >
        <SuspenseReveal>
          <TodayBody />
        </SuspenseReveal>
      </Suspense>
    </LateralPage>
  );
}

