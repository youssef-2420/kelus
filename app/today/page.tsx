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
  const router = useRouter();
  const { state, start, reset, completeSetup, completeDiagnosis, useDemo } = useLearner();
  if (!state.onboardingCompleted) return <FirstRunSetup onComplete={completeSetup} onUseDemo={useDemo} />;
  if (!state.diagnosisCompleted) return <InitialDiagnosis snapshot={state.snapshot} onComplete={completeDiagnosis} />;

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);
  if (!course || !exam) return <AppShell><p>No active destination.</p></AppShell>;
  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({ concepts, relationships: snapshot.relationships, events: snapshot.events, exam, nowIso });
  const readiness = estimatedReadiness(concepts);
  const days = daysUntilExam(exam, nowIso);
  const courseId = course.id;
  const examId = exam.id;

  function begin() {
    const sessionId = start(courseId, examId);
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <AppShell action={<button type="button" className="text-btn" onClick={reset}>Start over</button>}>
      <section className="today-destination">
        <div><p className="kicker">{exam.target}</p><h1>Today’s route</h1></div>
        <dl><div><dt>Exam</dt><dd>{days} days</dd></div><div><dt>Target</dt><dd>{exam.targetPercent}%</dd></div></dl>
      </section>

      <RouteKnowledgeMap concepts={concepts} route={route} readiness={readiness} target={exam.targetPercent} />

      <section className="today-allocation" aria-labelledby="allocation-title">
        <header><div><p className="kicker">Highest learning value first</p><h2 id="allocation-title">Your best {route.availableMinutes} minutes</h2></div><p>Not the weakest topics. The most valuable next actions.</p></header>
        <TodayRoute route={route} concepts={concepts} />
      </section>

      <div className="today-primary-action">
        <button type="button" className="cta" onClick={begin}>Start my route <span aria-hidden="true">→</span></button>
        <p>Kelus will recalculate when your answers change what matters next.</p>
      </div>
    </AppShell>
  );
}
