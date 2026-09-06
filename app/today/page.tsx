"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { InitialDiagnosis } from "@/components/InitialDiagnosis";
import { TodayRoute } from "@/components/TodayRoute";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { estimatedReadiness } from "@/domain/readiness";
import { generateRoute } from "@/domain/routing-engine";

export default function TodayPage() {
  const router = useRouter();
  const { state, start, reset, completeSetup, completeDiagnosis, useDemo } = useLearner();
  if (!state.onboardingCompleted) return <FirstRunSetup onComplete={(input) => { completeSetup(input); router.push("/materials"); }} onUseDemo={useDemo} />;
  if (!state.snapshot.concepts.length) return <AppShell><section className="materials-empty"><p className="kicker">Next step</p><h1>Bring in one real source.</h1><p>Add a syllabus or lecture PDF, then confirm the concepts Kelus should route through.</p><Link className="cta" href="/materials">Add course material <span aria-hidden="true">→</span></Link></section></AppShell>;
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
  const firstAllocation = route.allocations[0];
  const firstConcept = concepts.find((concept) => concept.id === firstAllocation?.conceptId);

  function begin() {
    const sessionId = start(courseId, examId);
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <AppShell action={<button type="button" className="text-btn" onClick={reset}>Start over</button>}>
      <section className="today-brief" aria-labelledby="today-title">
        <div className="today-brief-copy">
          <p className="kicker">Today · {course.name}</p>
          <h1 id="today-title">Your next {route.availableMinutes} minutes are decided.</h1>
          <p>{firstConcept ? `Start with ${firstConcept.name}. Kelus ranked it highest from your current learning evidence.` : "Kelus has ordered the most useful work for the time you have."}</p>
        </div>
        <dl className="today-context" aria-label="Current study context">
          <div className="today-readiness"><dt>Estimated ready</dt><dd>{Math.round(readiness * 100)}%</dd></div>
          <div><dt>Exam</dt><dd>{days} days</dd></div>
          <div><dt>Target</dt><dd>{exam.targetPercent}%</dd></div>
        </dl>
      </section>

      <section className="today-workbench" aria-labelledby="route-title">
        <div className="today-workbench-heading">
          <p className="kicker">Today’s route</p>
          <h2 id="route-title">Do this now.</h2>
        </div>
        <TodayRoute route={route} concepts={concepts} activities={snapshot.learningActivities} onStart={begin} />
      </section>
    </AppShell>
  );
}
