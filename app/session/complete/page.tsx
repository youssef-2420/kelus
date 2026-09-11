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
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";

function CompleteBody() {
  const search = useSearchParams();
  const { state } = useLearner();
  const [calendarNote, setCalendarNote] = useState("");
  const completionTracked = useRef<string | null>(null);
  const requestedId = search.get("id");
  const session = requestedId
    ? state.snapshot.sessions.find((item) => item.id === requestedId && item.status === "complete")
    : [...state.snapshot.sessions].reverse().find((item) => item.status === "complete");
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
  const practisedCount = new Set(state.snapshot.events.filter((event) => event.sessionId === session?.id && event.kind === "retrieval").map((event) => event.conceptId)).size;

  useEffect(() => {
    if (!session || !summary || completionTracked.current === session.id) return;
    completionTracked.current = session.id;
    trackEvent({
      name: "session_completed",
      concept_count: session.plannedConceptIds.length,
      planned_minutes: session.plannedMinutes,
    });
  }, [session, summary]);

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

  if (!session || !summary) return (
    <AppShell><section className="complete-hero"><p className="kicker">Revision session</p><h1>No completed session here yet.</h1><p>Finish a session to see what you practised and what needs another review.</p><Link href="/today" className="cta">Back to Today <span aria-hidden="true">→</span></Link></section></AppShell>
  );

  return (
    <AppShell>
      <section className="complete-hero">
        <p className="kicker">Today’s route complete</p>
        <h1>You’ve done your revision for now.</h1>
        <p>{practisedCount} {practisedCount === 1 ? "topic practised" : "topics practised"}{course ? ` in ${course.name}` : ""}. Your answers are saved for the next session.</p>
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
            ? <>Next suggested review: <strong>{nextStopName}</strong>.</>
            : "Your route stays on this device — open Today when you come back."}
        </h2>
        <p>
          {dueCount > 0
            ? `${dueCount} concept${dueCount === 1 ? "" : "s"} already due for review as memory fades.`
            : "Tomorrow’s route will shift as retention fades — no need to rebuild from scratch."}
        </p>
        <div className="complete-return-actions">
          <Link href="/today" className="cta">Back to Today <span aria-hidden="true">→</span></Link>
          <button type="button" className="text-btn" onClick={addCalendar}>
            Add tomorrow to calendar <span aria-hidden="true">→</span>
          </button>
        </div>
        <p className="complete-return-note" role="status" aria-live="polite">{calendarNote || "\u00a0"}</p>
      </section>
      {nextRoute ? (
        <details className="next-route">
          <summary>Preview your next revision topics</summary>
          <p className="kicker">Next route</p>
          <h2>Kelus will recalculate as your memory changes.</h2>
          <ol>{nextRoute.allocations.slice(0, 3).map((allocation, index) => <li key={allocation.conceptId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{allocation.conceptId === "mixed-retrieval" ? "Mixed Retrieval" : name(allocation.conceptId)}</strong><b>{allocation.minutes} min</b></li>)}</ol>
        </details>
      ) : null}
      {completedSessions === 1 ? <details><summary>Optional support through exam day</summary><SoftUpgradePrompt moment="first_session" /></details> : null}
      {completedSessions >= 2 ? (
        <details className="complete-waitlist">
          <summary>Get product updates</summary>
          <p className="kicker">Stay in the loop</p>
          <h2 id="complete-waitlist-title">Want a note when Kelus gets better for your course?</h2>
          <WaitlistForm source="session_complete" compact />
        </details>
      ) : null}
    </AppShell>
  );
}

export default function SessionCompletePage() {
  return (
    <LateralPage>
      <Suspense
        fallback={
          <SuspenseFallbackExit>
            <AppShell><p>Updating your route…</p></AppShell>
          </SuspenseFallbackExit>
        }
      >
        <SuspenseReveal>
          <CompleteBody />
        </SuspenseReveal>
      </Suspense>
    </LateralPage>
  );
}

