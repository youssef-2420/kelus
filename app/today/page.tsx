"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { RouteVisual } from "@/components/hero/RouteVisual";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { isDemoClockEnabled } from "@/domain/demo-clock";
import { courseMastery, daysUntilExam, planTodaySession } from "@/domain/scheduler";
import { greeting, percent } from "@/lib/format";
import { allocateStudyRoute } from "@/lib/study-route";

export default function TodayPage() {
  const router = useRouter();
  const { state, start, reset, skipDay, completeSetup } = useLearner();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { snapshot, nowIso } = state;
  if (!state.onboardingCompleted) return <FirstRunSetup onComplete={completeSetup} />;
  const course = snapshot.courses[0];
  if (!course) return <AppShell><p>No active course.</p></AppShell>;
  const exam = snapshot.exams.find((item) => item.courseId === course.id && item.isActive);
  if (!exam) return <AppShell><p>No active course.</p></AppShell>;
  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const plan = planTodaySession(concepts, exam, snapshot.relationships, nowIso);
  const days = daysUntilExam(exam, nowIso);
  const readiness = courseMastery(concepts);
  const route = allocateStudyRoute(plan.concepts, plan.plannedMinutes);
  const courseId = course.id;
  const examId = exam.id;

  function begin() {
    const sessionId = start(plan.concepts.map((row) => row.concept.id), plan.plannedMinutes, courseId, examId);
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <AppShell action={<button type="button" className="text-btn" onClick={reset}>Reset</button>}>
      <p className="kicker">{exam.target}</p>
      <h1 className="today-title">{greeting(nowIso)}, {snapshot.profile.displayName}.</h1>
      <p className="today-meta">
        <span>{days} days left</span>
        <span>{percent(readiness)} ready</span>
        <span>{route.reduce((sum, item) => sum + item.minutes, 0)} min today</span>
      </p>

      <section className="today-route">
        <div className="engine-route-head">
          <p className="engine-label">Your plan</p>
        </div>
        <RouteVisual items={route} hoveredId={hoveredId} onHover={setHoveredId} totalMinutes={route.reduce((sum, item) => sum + item.minutes, 0)} />
      </section>

      <div className="today-cta">
        <button type="button" className="cta home-cta" onClick={begin}>
          Start today’s plan
          <span className="arrow" aria-hidden="true">→</span>
        </button>
        <p className="quiet">One plan. No choosing between twenty topics.</p>
      </div>

      <KnowledgeMap heading="Topics" courseName={course.name} mastery={readiness} concepts={[...concepts].sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name))} />
      {process.env.NODE_ENV === "development" && isDemoClockEnabled() ? (
        <p><button type="button" className="text-btn" onClick={skipDay}>Simulate next day</button></p>
      ) : null}
    </AppShell>
  );
}
