"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { generateRoute } from "@/domain/routing-engine";
import { percent } from "@/lib/format";
import { WaitlistForm } from "@/components/WaitlistForm";

function CompleteBody() {
  const search = useSearchParams();
  const { state } = useLearner();
  const session = state.snapshot.sessions.find((item) => item.id === search.get("id"))
    ?? [...state.snapshot.sessions].reverse().find((item) => item.status === "complete");
  const summary = session?.summary;
  const course = state.snapshot.courses.find((item) => item.id === session?.courseId);
  const exam = state.snapshot.exams.find((item) => item.id === session?.examId);
  const name = (id: string) => state.snapshot.concepts.find((concept) => concept.id === id)?.name ?? id;
  const nextRoute = course && exam ? generateRoute({
    concepts: state.snapshot.concepts.filter((concept) => concept.courseId === course.id),
    relationships: state.snapshot.relationships,
    events: state.snapshot.events,
    exam,
    nowIso: state.nowIso,
  }) : null;

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
      {nextRoute ? (
        <section className="next-route">
          <p className="kicker">Next route</p>
          <h2>Kelus will recalculate as your memory changes.</h2>
          <ol>{nextRoute.allocations.slice(0, 3).map((allocation, index) => <li key={allocation.conceptId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{allocation.conceptId === "mixed-retrieval" ? "Mixed Retrieval" : name(allocation.conceptId)}</strong><b>{allocation.minutes} min</b></li>)}</ol>
        </section>
      ) : null}
      <section className="complete-waitlist" aria-labelledby="complete-waitlist-title">
        <p className="kicker">Stay in the loop</p>
        <h2 id="complete-waitlist-title">Want a note when Kelus gets better for your course?</h2>
        <WaitlistForm source="session_complete" compact />
      </section>
      <Link href="/today" className="cta complete-done">Back to today <span aria-hidden="true">→</span></Link>
    </AppShell>
  );
}

export default function SessionCompletePage() {
  return <Suspense fallback={<AppShell><p>Updating your route…</p></AppShell>}><CompleteBody /></Suspense>;
}
