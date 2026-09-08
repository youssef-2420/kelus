"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { generateRoute } from "@/domain/routing-engine";
import { percent } from "@/lib/format";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SoftUpgradePrompt } from "@/components/SoftUpgradePrompt";
import { downloadTomorrowStudyIcs } from "@/lib/study-reminder";
import { trackEvent } from "@/lib/analytics";

function CompleteBody() {
  const search = useSearchParams();
  const { state } = useLearner();
  const [calendarNote, setCalendarNote] = useState("");
  const completionTracked = useRef<string | null>(null);
  const session = state.snapshot.sessions.find((item) => item.id === search.get("id"))
    ?? [...state.snapshot.sessions].reverse().find((item) => item.status === "complete");
  const summary = session?.summary;
  const course = state.snapshot.courses.find((item) => item.id === session?.courseId);
  const exam = state.snapshot.exams.find((item) => item.id === session?.examId);
  const name = (id: string) => state.snapshot.concepts.find((concept) => concept.id === id)?.name ?? id;
  const completedSessions = state.snapshot.sessions.filter((item) => item.status === "complete").length;
  const courseConcepts = course
    ? state.snapshot.concepts.filter((concept) => concept.courseId === course.id)
    : [];
  const nextRoute = course && exam ? generateRoute({
    concepts: courseConcepts,
    relationships: state.snapshot.relationships,
    events: state.snapshot.events,
    exam,
    nowIso: state.nowIso,
  }) : null;
  const nextStopId = nextRoute?.allocations[0]?.conceptId;
  const nextStopName = nextStopId
    ? (nextStopId === "mixed-retrieval" ? "mixed retrieval" : name(nextStopId))
    : null;
  const dueCount = courseConcepts.filter((concept) => {
    if (!concept.nextReviewAt) return false;
    return Date.parse(concept.nextReviewAt) <= Date.parse(state.nowIso);
  }).length;
  const minutes = session?.plannedMinutes || exam?.availableMinutes || 45;

  useEffect(() => {
    if (!session || completionTracked.current === session.id) return;
    completionTracked.current = session.id;
    trackEvent({
      name: "session_completed",
      concept_count: session.plannedConceptIds.length,
      planned_minutes: session.plannedMinutes,
    });
  }, [session]);

  function addCalendar() {
    const ok = downloadTomorrowStudyIcs({
      courseName: course?.name ?? "Study",
      minutes,
      nextStopName,
      todayUrl: "https://kelus.me/today/",
    });
    setCalendarNote(
      ok
        ? "Calendar file downloaded. Open it to add tomorrow’s study block — works even if this tab is closed."
        : "Could not build a calendar file in this browser.",
    );
  }

  return (
    <AppShell>
      <section className="complete-hero">
        <p className="kicker">Today’s route complete</p>
        <h1>{session?.plannedMinutes ?? 0} minutes, allocated with intent.</h1>
        {summary ? <div className="readiness-change"><span>{percent(summary.readinessBefore)}</span><i aria-hidden="true">→</i><strong>{percent(summary.readinessAfter)}</strong><small>estimated readiness</small></div> : null}
      </section>
      {summary ? (
        <div className="complete-columns">
          <section><p className="kicker">Strengthened</p>{summary.strengthenedIds.length ? summary.strengthenedIds.slice(0, 3).map((id) => <p key={id}>{name(id)}</p>) : <p>No clear movement yet</p>}</section>
          <section><p className="kicker">Needs attention</p>{summary.stillWeakIds.length ? summary.stillWeakIds.slice(0, 3).map((id) => <p key={id}>{name(id)}</p>) : <p>No urgent gap</p>}</section>
        </div>
      ) : null}
      <section className="complete-return" aria-labelledby="complete-return-title">
        <p className="kicker">Come back tomorrow</p>
        <h2 id="complete-return-title">
          {nextStopName
            ? <>Kelus will put <strong>{nextStopName}</strong> first when you return.</>
            : "Your route stays on this device — open Today when you come back."}
        </h2>
        <p>
          {dueCount > 0
            ? `${dueCount} concept${dueCount === 1 ? "" : "s"} already due for review as memory fades.`
            : "Tomorrow’s route will shift as retention fades — no need to rebuild from scratch."}
        </p>
        <div className="complete-return-actions">
          <button type="button" className="cta" onClick={addCalendar}>
            Add tomorrow to calendar <span aria-hidden="true">→</span>
          </button>
          <Link href="/today" className="text-btn">Open Today</Link>
        </div>
        <p className="complete-return-note" role="status" aria-live="polite">{calendarNote || "\u00a0"}</p>
      </section>
      {nextRoute ? (
        <section className="next-route">
          <p className="kicker">Next route</p>
          <h2>Kelus will recalculate as your memory changes.</h2>
          <ol>{nextRoute.allocations.slice(0, 3).map((allocation, index) => <li key={allocation.conceptId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{allocation.conceptId === "mixed-retrieval" ? "Mixed Retrieval" : name(allocation.conceptId)}</strong><b>{allocation.minutes} min</b></li>)}</ol>
        </section>
      ) : null}
      {completedSessions === 1 ? <SoftUpgradePrompt moment="first_session" /> : null}
      {completedSessions >= 2 ? (
        <section className="complete-waitlist" aria-labelledby="complete-waitlist-title">
          <p className="kicker">Stay in the loop</p>
          <h2 id="complete-waitlist-title">Want a note when Kelus gets better for your course?</h2>
          <WaitlistForm source="session_complete" compact />
        </section>
      ) : null}
      <Link href="/today" className="cta complete-done">Open tomorrow’s Today <span aria-hidden="true">→</span></Link>
    </AppShell>
  );
}

export default function SessionCompletePage() {
  return <Suspense fallback={<AppShell><p>Updating your route…</p></AppShell>}><CompleteBody /></Suspense>;
}
