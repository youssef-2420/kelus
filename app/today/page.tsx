"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { isDemoClockEnabled } from "@/domain/demo-clock";
import { courseMastery } from "@/domain/scheduler";
import { attentionCount, daysUntilExam, planTodaySession } from "@/domain/scheduler";
import { greeting, percent } from "@/lib/format";

export default function TodayPage() {
  const router = useRouter();
  const { state, start, reset, skipDay } = useLearner();
  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course.id && item.isActive);
  if (!course || !exam) return <AppShell><p>No active course.</p></AppShell>;
  const activeExam = exam;
  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const plan = planTodaySession(concepts, activeExam, snapshot.relationships, nowIso);
  const days = daysUntilExam(activeExam, nowIso);
  const attention = attentionCount(concepts);

  function begin() {
    const sessionId = start(plan.concepts.map((row) => row.concept.id), plan.plannedMinutes, course.id, activeExam.id);
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <AppShell action={<button type="button" className="text-btn" onClick={reset}>Reset demo</button>}>
      <section className="hero">
        <h1>{greeting(nowIso)}, {snapshot.profile.displayName}.</h1>
        <div className="pulse">
          <p className="kicker">{activeExam.target}</p>
          <p className="days">Your exam is in {days} day{days === 1 ? "" : "s"}.</p>
          <p className="quiet">{attention} concept{attention === 1 ? "" : "s"} need attention.</p>
          <p style={{ marginTop: 20 }}>
            <button type="button" className="cta" onClick={begin}>Start today’s session</button>
          </p>
        </div>
      </section>
      <section className="section">
        <h2>Today</h2>
        <div className="plan">
          <span><b>{plan.plannedMinutes}</b><small>minutes recommended</small></span>
          <span><b>{plan.concepts.length}</b><small>concepts</small></span>
          <span><b>{plan.weak}</b><small>weak</small></span>
          <span><b>{plan.fading}</b><small>fading</small></span>
        </div>
        <p className="quiet" style={{ marginTop: 10 }}>{plan.nextNew} new · {percent(courseMastery(concepts))} course mastery</p>
      </section>
      <KnowledgeMap courseName={course.name} mastery={courseMastery(concepts)} concepts={[...concepts].sort((a, b) => b.mastery - a.mastery || a.name.localeCompare(b.name))} />
      {process.env.NODE_ENV === "development" && isDemoClockEnabled() ? (
        <p><button type="button" className="text-btn" onClick={skipDay}>Simulate next day</button></p>
      ) : null}
    </AppShell>
  );
}
