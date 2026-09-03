"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { percent } from "@/lib/format";

function CompleteBody() {
  const search = useSearchParams();
  const { state } = useLearner();
  const sessionId = search.get("id");
  const session = state.snapshot.sessions.find((item) => item.id === sessionId)
    ?? [...state.snapshot.sessions].reverse().find((item) => item.status === "complete");
  const summary = session?.summary;
  const name = (id: string) => state.snapshot.concepts.find((concept) => concept.id === id)?.name ?? id;
  return (
    <AppShell>
      <p className="kicker quiet">Session complete</p>
      <h1 style={{ fontSize: "clamp(32px, 6vw, 48px)" }}>That’s the work for now.</h1>
      {summary ? (
        <section className="detail" style={{ marginTop: 28 }}>
          <dl>
            <div><dt>Mastery gained</dt><dd>{percent(Math.max(0, summary.masteryGained / Math.max(1, session?.plannedConceptIds.length ?? 1)))} avg</dd></div>
            <div><dt>Strengthened</dt><dd>{summary.strengthenedIds.length}</dd></div>
            <div><dt>Still weak</dt><dd>{summary.stillWeakIds.length}</dd></div>
          </dl>
          {summary.strengthenedIds.length ? <p style={{ marginTop: 24 }}>{summary.strengthenedIds.map(name).join(" · ")}</p> : null}
          {summary.stillWeakIds.length ? <p className="quiet">Still weak: {summary.stillWeakIds.map(name).join(" · ")}</p> : null}
        </section>
      ) : <p className="quiet">No session summary yet.</p>}
      <p style={{ marginTop: 32 }}>
        <Link href="/today" className="cta">Back to today</Link>
      </p>
      <p className="quiet" style={{ marginTop: 16 }}>Next: open Kelus tomorrow. The map will have moved.</p>
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
