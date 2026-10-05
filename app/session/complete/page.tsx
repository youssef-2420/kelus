"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { generateRoute } from "@/domain/routing-engine";
import { MasteryEvidence } from "@/components/MasteryEvidence";
import { MarkStamp } from "@/components/MarkStamp";
import { ReadinessShift } from "@/components/ReadinessShift";
import { RouteShift } from "@/components/RouteShift";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SoftUpgradePrompt } from "@/components/SoftUpgradePrompt";
import { downloadTomorrowStudyIcs } from "@/lib/study-reminder";
import { trackEvent } from "@/lib/analytics";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";

function CompleteBody() {
  const search = useSearchParams();
  const reduceMotion = useReducedMotion();
  const { state } = useLearner();
  const [calendarNote, setCalendarNote] = useState("");
  const [usefulness, setUsefulness] = useState<boolean | null>(null);
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
  const strengthenedNames = summary?.strengthenedIds.slice(0, 2).map(name) ?? [];
  const weakNames = summary?.stillWeakIds.slice(0, 2).map(name) ?? [];
  const nextAllocation = nextRoute?.allocations[0];
  const nextMinutes = nextAllocation?.minutes ?? null;
  const nextConcept = nextAllocation && nextAllocation.conceptId !== "mixed-retrieval"
    ? courseConcepts.find((concept) => concept.id === nextAllocation.conceptId)
    : undefined;
  const notRecalledYet = Boolean(nextConcept && nextConcept.failedRetrievals > 0 && nextConcept.successfulRetrievals === 0);
  const nextReason = notRecalledYet
    ? "You have not recalled it yet. A second try now helps it stick."
    : nextAllocation?.reasons.includes("PREREQUISITE_GAP")
    ? "It unlocks another topic."
    : nextAllocation?.reasons.includes("LOW_MASTERY")
      ? "It still needs another pass."
      : nextAllocation?.reasons.includes("REVIEW_DUE") || nextAllocation?.reasons.includes("RETENTION_FADING")
      ? "It is the next memory at risk."
      : nextAllocation?.reasons.includes("HIGH_EXAM_VALUE")
        ? "It carries high exam value."
        : "It offers the strongest next learning gain.";

  const routeNames = (ids: string[]) => ids.filter((id) => id !== "mixed-retrieval").slice(0, 4).map((id) => ({ id, name: name(id) }));
  const routeBefore = routeNames(session?.initialRoute.allocations.map((allocation) => String(allocation.conceptId)) ?? []);
  const routeAfter = routeNames(nextRoute?.allocations.map((allocation) => String(allocation.conceptId)) ?? []);
  const sameTopics = routeBefore.length === routeAfter.length && routeBefore.every((item) => routeAfter.some((other) => other.id === item.id));
  const routeMoved = sameTopics && routeBefore.map((item) => item.id).join("|") !== routeAfter.map((item) => item.id).join("|");

  useEffect(() => {
    document.body.classList.add("is-session-booklet", "is-session-complete");
    return () => document.body.classList.remove("is-session-booklet", "is-session-complete");
  }, []);

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
    trackEvent({ name: "next_route_opened", source: "calendar" });
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

  if (!session || !summary) {
    return (
      <main id="main" className="study-shell is-complete-page">
        <section className="complete-hero is-empty">
          <p className="study-mark-kicker">Session</p>
          <h1>No completed session here yet.</h1>
          <p>Finish a session to see what you practised and what needs another review.</p>
          <Link href="/today" className="cta">
            Back to Today <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main" className="study-shell is-complete-page">
      <motion.section
        className="complete-folio is-page"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.5 }}
      >
        <MarkStamp outcome={strengthenedNames.length ? "success" : "partial"} label={strengthenedNames.length ? "Session complete, topics strengthened" : "Session complete, gaps found"} />
        <h1>Done.</h1>
        <p className="complete-whisper">
          {practisedCount} {practisedCount === 1 ? "topic practised" : "topics practised"}
          {course ? ` in ${course.name}` : ""}. Your answers are saved for the next session.
        </p>
        {exam ? <ReadinessShift before={summary.readinessBefore} after={summary.readinessAfter} targetPercent={exam.targetPercent} /> : null}
        <section className="complete-change" aria-labelledby="complete-change-title">
          <p className="kicker">What changed</p>
          <h2 id="complete-change-title">
            {strengthenedNames.length
              ? <>You strengthened <strong>{strengthenedNames.join(" & ")}</strong>.</>
              : weakNames.length
                ? <>You found the next gap: <strong>{weakNames.join(" & ")}</strong>.</>
                : "You added fresh evidence to your route."}
          </h2>
          <p>
            {weakNames.length
              ? `Keep ${weakNames.join(" and ")} in your next pass instead of guessing what to revise.`
              : "Your next route is based on what you could retrieve, not only what you completed."}
          </p>
        </section>
        {routeMoved ? (
          <section className="complete-route-moved" aria-label="How your route moved">
            <p className="kicker">Your route moved</p>
            <RouteShift before={routeBefore} after={routeAfter} />
          </section>
        ) : null}
        {nextStopName ? (
          <Link href="/today" className="cta complete-next-cta" onClick={() => trackEvent({ name: "next_route_opened", source: "completion" })}>
            Next: {nextStopName}{nextMinutes ? ` · ${nextMinutes} min` : ""} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
        {nextStopName ? <p className="complete-next-reason">{nextReason}</p> : null}

        <details className="complete-useful-change">
          <summary>The useful change</summary>
          <h2 id="complete-before-after-title">You turned uncertainty into a next move.</h2>
          <div className="complete-before-after-grid">
            <div>
              <span>Before</span>
              <strong>{weakNames.length ? `${weakNames.join(" and ")} needed evidence` : "Your route had less evidence"}</strong>
              <p>Kelus did not know which part needed another pass.</p>
            </div>
            <div>
              <span>After</span>
              <strong>{nextStopName ? `${nextStopName} is first next` : "Your route has fresh evidence"}</strong>
              <p>{nextMinutes ? `A focused ${nextMinutes}-minute pass. ${nextReason}` : nextReason}</p>
            </div>
          </div>
        </details>

        <section className="complete-return" aria-labelledby="complete-return-title">
          <p className="kicker">Come back tomorrow</p>
          <h2 id="complete-return-title">
            {nextStopName
              ? <>When you return, start with <strong>{nextStopName}</strong>.</>
              : "Your route stays on this device — open Today when you come back."}
          </h2>
          <p>
            {dueCount > 0
              ? `${dueCount} topic${dueCount === 1 ? "" : "s"} already due as memory fades.`
              : "The route will shift as retention fades — no need to rebuild from scratch."}
          </p>
          <div className="complete-return-actions">
            <Link href="/today" className="text-btn" onClick={() => trackEvent({ name: "next_route_opened", source: "completion" })}>
              Back to Today <span aria-hidden="true">→</span>
            </Link>
            <button type="button" className="text-btn" onClick={addCalendar}>
              Add tomorrow to calendar <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="complete-return-note" role="status" aria-live="polite">
            {calendarNote || "\u00a0"}
          </p>
        </section>

        <section className="complete-usefulness" aria-labelledby="complete-usefulness-title">
          <p className="kicker">One quick check</p>
          <h2 id="complete-usefulness-title">Did this help you decide what to study next?</h2>
          {usefulness === null ? (
            <div className="complete-usefulness-actions" role="group" aria-label="Rate study usefulness">
              <button type="button" onClick={() => { setUsefulness(true); trackEvent({ name: "session_usefulness_rated", helpful: true }); }}>Yes</button>
              <button type="button" onClick={() => { setUsefulness(false); trackEvent({ name: "session_usefulness_rated", helpful: false }); }}>Not yet</button>
            </div>
          ) : (
            <p className="complete-usefulness-thanks" role="status" aria-live="polite">
              {usefulness ? "Good. Kelus will keep using the evidence that helped you choose." : "Thanks. The next route should make the decision clearer."}
            </p>
          )}
        </section>

        {summary ? (
          <details className="complete-moved">
            <summary>What moved</summary>
            <div className="complete-columns">
              <section>
                <p className="kicker">Strengthened</p>
                {summary.strengthenedIds.length
                  ? summary.strengthenedIds.slice(0, 3).map((id) => <p key={id}>{name(id)}</p>)
                  : <p>No clear movement yet</p>}
              </section>
              <section>
                <p className="kicker">Needs attention</p>
                {summary.stillWeakIds.length
                  ? summary.stillWeakIds.slice(0, 3).map((id) => <p key={id}>{name(id)}</p>)
                  : <p>No urgent gap</p>}
              </section>
            </div>
          </details>
        ) : null}

        {nextRoute ? (
          <details className="next-route">
            <summary>Preview your next revision topics</summary>
            <p className="kicker">Next route</p>
            <h2>Kelus will recalculate as your memory changes.</h2>
            {nextStopName ? <p className="next-route-reason">Start with <strong>{nextStopName}</strong> next time. {nextReason}</p> : null}
            <ol>
              {nextRoute.allocations.slice(0, 3).map((allocation, index) => (
                <li key={allocation.conceptId}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>
                    {allocation.conceptId === "mixed-retrieval" ? "Mixed Retrieval" : name(allocation.conceptId)}
                  </strong>
                  <b>{allocation.minutes} min</b>
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        <details className="complete-evidence">
          <summary>Evidence</summary>
          <MasteryEvidence />
        </details>

        {completedSessions === 1 ? (
          <details>
            <summary>Optional support through exam day</summary>
            <SoftUpgradePrompt moment="first_session" />
          </details>
        ) : null}
        {completedSessions >= 2 ? (
          <details className="complete-waitlist">
            <summary>Get product updates</summary>
            <p className="kicker">Stay in the loop</p>
            <h2 id="complete-waitlist-title">Want a note when Kelus gets better for your course?</h2>
            <WaitlistForm source="session_complete" compact />
          </details>
        ) : null}
      </motion.section>
    </main>
  );
}

export default function SessionCompletePage() {
  return (
    <LateralPage>
      <Suspense
        fallback={
          <SuspenseFallbackExit>
            <main id="main" className="study-shell is-complete-page">
              <p>Updating your route…</p>
            </main>
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
