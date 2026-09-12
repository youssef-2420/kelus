"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { InitialDiagnosis } from "@/components/InitialDiagnosis";
import { TodayRoute } from "@/components/TodayRoute";
import { useLearner } from "@/components/LearnerProvider";
import { trackEvent } from "@/lib/analytics";
import { daysUntilExam } from "@/domain/scheduler";
import { generateRoute } from "@/domain/routing-engine";
import { greeting } from "@/lib/format";
import { lastSessionCompletedAt } from "@/lib/demo-store";
import { ROUTE_FLAG } from "@/lib/route-flag";
import { LateralPage } from "@/components/PageTransition";

function RestoringToday() {
  return (
    <main id="main" className="destination-page is-restoring-today">
      <p className="destination-brand">Kelus</p>
      <h1 className="destination-page-title">Today’s route</h1>
      <p>Restoring your course on this device…</p>
    </main>
  );
}

function QuietTodayBoot() {
  return (
    <main id="main" className="destination-page is-restoring-today" aria-busy="true">
      <p className="destination-brand">Kelus</p>
      <h1 className="destination-page-title">Today’s route</h1>
    </main>
  );
}

function readHasRouteHint() {
  return document.cookie.split("; ").some((part) => part === `${ROUTE_FLAG}=1`);
}

export function TodayClient() {
  const router = useRouter();
  const { state, start, reset, completeSetup, completeDiagnosis, useDemo: loadDemo } = useLearner();
  const [confirmReset, setConfirmReset] = useState(false);
  const [boot, setBoot] = useState<{ ready: boolean; hasRouteHint: boolean; wantsSample: boolean }>({
    ready: false,
    hasRouteHint: false,
    wantsSample: false,
  });
  const sampleHandled = useRef(false);
  const sampleBooting = boot.ready && boot.wantsSample && !state.onboardingCompleted;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantsSample = params.get("sample") === "1";
    setBoot({
      ready: true,
      hasRouteHint: readHasRouteHint(),
      wantsSample,
    });
  }, []);

  useEffect(() => {
    if (!boot.ready || !boot.wantsSample) return;
    if (sampleHandled.current) return;
    sampleHandled.current = true;
    const alreadyReady = state.onboardingCompleted && state.snapshot.concepts.length > 0;
    if (!alreadyReady) {
      loadDemo();
      trackEvent({ name: "sample_loaded", source: "today_query" });
    }
    router.replace("/today");
  }, [boot.ready, boot.wantsSample, state.onboardingCompleted, state.snapshot.concepts.length, loadDemo, router]);

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

  if (!boot.ready) {
    return (
      <LateralPage>
        <QuietTodayBoot />
      </LateralPage>
    );
  }

  if (sampleBooting) {
    return (
      <LateralPage>
      <main id="main" className="destination-page">
        <p className="destination-brand">Kelus</p>
        <h1 className="destination-page-title">Loading sample…</h1>
        <p>Opening a finished course model so you can see Today in about a minute.</p>
      </main>
      </LateralPage>
    );
  }

  // Hard refresh: store still empty on the first client paint. Prefer a Today-shaped
  // restore shell over flashing FirstRunSetup when this device already has a route.
  if (!state.onboardingCompleted && boot.hasRouteHint) {
    return (
      <LateralPage>
        <RestoringToday />
      </LateralPage>
    );
  }

  if (!state.onboardingCompleted) {
    return (
      <LateralPage>
      <FirstRunSetup
        onComplete={(input) => {
          try { window.localStorage.setItem("kelus-first-route-started-at", String(Date.now())); } catch { /* Timing analytics are optional. */ }
          completeSetup(input);
          router.push("/materials");
        }}
        onUseDemo={loadDemo}
      />
      </LateralPage>
    );
  }

  if (!state.snapshot.concepts.length) {
    return (
      <LateralPage>
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
      </LateralPage>
    );
  }

  if (!state.diagnosisCompleted) {
    return (
      <LateralPage>
        <InitialDiagnosis snapshot={state.snapshot} onComplete={finishDiagnosis} />
      </LateralPage>
    );
  }

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);
  if (!course || !exam) {
    return (
      <LateralPage>
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Today</p>
          <h1>Set your exam first.</h1>
          <p>Kelus needs a course and exam date before it can build today’s route.</p>
          <button type="button" className="cta" onClick={() => reset()}>Start over</button>
        </section>
      </AppShell>
      </LateralPage>
    );
  }

  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({ concepts, relationships: snapshot.relationships, events: snapshot.events, exam, nowIso });
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
    <LateralPage>
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
      <section className="today-brief is-booklet-today" aria-labelledby="today-title">
        <div className="today-brief-copy">
          <p className="kicker">Today</p>
          <h1 id="today-title">Today’s route</h1>
          {returning ? (
            <p className="today-welcome">
              {greeting(nowIso)}. Welcome back
              {dueCount > 0 ? ` · ${dueCount} concept${dueCount === 1 ? "" : "s"} due for review` : ""}.
            </p>
          ) : null}
          <p className="today-brief-lede">
            {route.availableMinutes} minutes for revision today. Start with one topic.
            <span className="today-brief-exam"> Exam in {days} days · target {exam.targetPercent}%.</span>
          </p>
          <p className="today-readiness-hint" id="today-readiness-hint">
            Est. readiness is from your ratings and recall checks — not a grade prediction.
          </p>
        </div>
      </section>

      <section className="today-workbench is-booklet-today" aria-labelledby="route-title">
        <h2 id="route-title" className="today-workbench-heading">
          Next
        </h2>
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
    </LateralPage>
  );
}
