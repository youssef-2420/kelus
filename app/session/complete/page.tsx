"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { planTodaySession } from "@/domain/scheduler";
import { percent } from "@/lib/format";

function CompleteBody() {
  const search = useSearchParams();
  const { state } = useLearner();
  const sessionId = search.get("id");
  const session = state.snapshot.sessions.find((item) => item.id === sessionId)
    ?? [...state.snapshot.sessions].reverse().find((item) => item.status === "complete");
  const summary = session?.summary;
  const name = (id: string) => state.snapshot.concepts.find((concept) => concept.id === id)?.name ?? id;
  const course = state.snapshot.courses[0];
  const exam = state.snapshot.exams.find((item) => item.isActive);
  const tomorrow = course && exam
    ? planTodaySession(
      state.snapshot.concepts.filter((concept) => concept.courseId === course.id),
      exam,
      state.snapshot.relationships,
      state.nowIso,
    ).concepts.slice(0, 3)
    : [];

  return (
    <AppShell>
      <p className="kicker">Plan updated</p>
      <h1 className="today-title">Session complete. Tomorrow’s order changed.</h1>
      {summary ? (
        <section className="detail stack-gap">
          <dl>
            <div><dt>Strengthened</dt><dd>{summary.strengthenedIds.length ? summary.strengthenedIds.map(name).join(", ") : "—"}</dd></div>
            <div><dt>Still weak</dt><dd>{summary.stillWeakIds.length ? summary.stillWeakIds.map(name).join(", ") : "—"}</dd></div>
            <div><dt>Mastery gained</dt><dd>{percent(Math.max(0, summary.masteryGained / Math.max(1, session?.plannedConceptIds.length ?? 1)))}</dd></div>
          </dl>
        </section>
      ) : <p className="quiet">No session summary yet.</p>}
      {tomorrow.length ? (
        <section className="section">
          <h2>Tomorrow</h2>
          <ol className="engine-tomorrow">
            {tomorrow.map((row, index) => (
              <li key={row.concept.id}>
                <span className="num">{String(index + 1).padStart(2, "0")}</span>
                <span>{row.concept.name}</span>
                <span className="quiet">{percent(row.concept.mastery)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <p className="session-actions">
        <Link href="/today" className="cta home-cta">Back to today<span className="arrow" aria-hidden="true">→</span></Link>
      </p>
    </AppShell>
  );
}

export default function SessionCompletePage() {
  return (
    <Suspense fallback={<AppShell><p>Loading summary…</p></AppShell>}>
      <CompleteBody />
    </Suspense>
  );
}
