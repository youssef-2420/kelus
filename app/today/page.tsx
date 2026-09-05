"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { InitialDiagnosis } from "@/components/InitialDiagnosis";
import { RouteKnowledgeMap } from "@/components/RouteKnowledgeMap";
import { TodayRoute } from "@/components/TodayRoute";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { estimatedReadiness } from "@/domain/readiness";
import { generateRoute } from "@/domain/routing-engine";

export default function TodayPage() {
  const { state, completeSetup, completeDiagnosis, useDemo } = useLearner();
  if (!state.onboardingCompleted) return <FirstRunSetup onComplete={completeSetup} onUseDemo={useDemo} />;
  if (!state.diagnosisCompleted) return <InitialDiagnosis snapshot={state.snapshot} onComplete={completeDiagnosis} />;
  return <TodayStage />;
}

function TodayStage() {
  const router = useRouter();
  const { state, start } = useLearner();

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);
  if (!course || !exam) return <AppShell><p>No active destination.</p></AppShell>;
  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({ concepts, relationships: snapshot.relationships, events: snapshot.events, exam, nowIso });
  const readiness = estimatedReadiness(concepts);
  const days = daysUntilExam(exam, nowIso);
  const ready = Math.round(readiness * 100);
  const courseId = course.id;
  const examId = exam.id;

  function begin() {
    const sessionId = start(courseId, examId);
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <AppShell>
      <div className="today-stage">
        <header className="today-dest">
          <h1>{exam.target}</h1>
          <p className="today-dest-meta">
            <span>{days} days</span>
            <span>Target {exam.targetPercent}%</span>
          </p>
        </header>

        <div className="today-stat">
          <p className="today-stat-num">{ready}%</p>
          <p className="today-stat-label">Ready</p>
        </div>

        <RouteKnowledgeMap concepts={concepts} route={route} target={exam.targetPercent} />

        <TodayRoute route={route} concepts={concepts} />

        <div className="today-primary-action">
          <button type="button" className="cta" onClick={begin}>
            Start route <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
