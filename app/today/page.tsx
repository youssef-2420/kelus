"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function TodayPage() {
  const router = useRouter();
  const { state, start, reset, completeSetup, completeDiagnosis, useDemo } = useLearner();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!state.onboardingCompleted) {
    return (
      <FirstRunSetup
        onComplete={(input) => {
          completeSetup(input);
          router.push("/materials");
        }}
        onUseDemo={useDemo}
      />
    );
  }

  if (!state.snapshot.concepts.length) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Next step</p>
          <h1>Bring in one real source.</h1>
          <p>Add a syllabus or lecture PDF, then confirm the concepts Kelus should route through.</p>
          <div className="materials-empty-actions">
            <Link className="cta" href="/materials">
              Add course material <span aria-hidden="true">→</span>
            </Link>
            <button type="button" className="text-btn" onClick={() => useDemo()}>
              Try a sample course <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  if (!state.diagnosisCompleted) {
    return <InitialDiagnosis snapshot={state.snapshot} onComplete={completeDiagnosis} />;
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
          <p>Kelus needs a course and exam before it can build today’s route.</p>
          <button type="button" className="cta" onClick={() => reset()}>Start over</button>
        </section>
      </AppShell>
    );
  }

  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({ concepts, relationships: snapshot.relationships, events: snapshot.events, exam, nowIso });
  const readiness = estimatedReadiness(concepts);
  const days = daysUntilExam(exam, nowIso);
  const firstAllocation = route.allocations[0];
  const firstConcept = concepts.find((concept) => concept.id === firstAllocation?.conceptId);
  const firstName = firstConcept?.name ?? "mixed retrieval";
  const courseId = course.id;
  const examId = exam.id;

  function begin() {
    const sessionId = start(courseId, examId);
    trackEvent({ name: "session_started" });
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
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
      <section className="today-brief" aria-labelledby="today-title">
        <div className="today-brief-copy">
          <p className="kicker">Today · {course.name}</p>
          <h1 id="today-title">Today’s route</h1>
          <p>
            {firstName} first · {route.availableMinutes} minutes · exam in {days} days · aim {exam.targetPercent}%
          </p>
        </div>
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
      </section>

      <section className="today-workbench" aria-labelledby="route-title">
        <div className="today-workbench-heading">
          <p className="kicker">This session</p>
          <h2 id="route-title">Do this now.</h2>
        </div>
        <TodayRoute
          route={route}
          concepts={concepts}
          activities={snapshot.learningActivities}
          onStart={begin}
        />
      </section>
    </AppShell>
  );
}
