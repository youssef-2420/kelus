"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { HabitStrip } from "@/components/HabitStrip";
import { generateRoute } from "@/domain/routing-engine";
import { MarkStamp } from "@/components/MarkStamp";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SoftUpgradePrompt } from "@/components/SoftUpgradePrompt";
import { downloadTomorrowStudyIcs } from "@/lib/study-reminder";
import { trackEvent } from "@/lib/analytics";
import { PackArt } from "@/components/PackArt";
import { KelusLogoMark } from "@/components/KelusLogoMark";
import styles from "./complete.module.css";

const OUTCOME: Record<string, string> = { success: "Solid pass", partial: "Partly there", failure: "Needs another attempt" };

/** Partly there, as a half-filled dot: halfway, not a minus. */
function HalfDot() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.75A6.25 6.25 0 0 0 8 14.25Z" fill="currentColor" />
    </svg>
  );
}

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
  // The calendar entry names the same next topic the page does: one this block did not just cover.
  const coveredIds = new Set(state.snapshot.events.filter((event) => event.sessionId === session?.id && event.kind === "retrieval").map((event) => event.conceptId));
  const nextStopId = nextRoute?.allocations.find((allocation) => allocation.conceptId !== "mixed-retrieval" && !coveredIds.has(allocation.conceptId))?.conceptId;
  const nextStopName = nextStopId ? name(nextStopId) : null;
  const minutes = session?.plannedMinutes || exam?.availableMinutes || 45;

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

  // What this block was: each topic once, with how its last answer went, in the result card's own words.
  const sessionAnswers = state.snapshot.events.filter((event) => event.sessionId === session.id && event.kind === "retrieval");
  const practised = [...new Map(sessionAnswers.map((event) => [event.conceptId, event])).values()];
  const known = practised.filter((event) => event.outcome === "success");
  const rank = { failure: 0, partial: 1, success: 2 } as const;
  const weakest = [...practised].filter((event) => event.outcome !== "success").sort((a, b) => rank[a.outcome ?? "partial"] - rank[b.outcome ?? "partial"])[0];
  const missedToday = (state.missedLines ?? []).filter((line) => line.at >= session.startedAt && practised.some((event) => event.conceptId === line.conceptId)).length;
  const nextFresh = nextStopId ? { conceptId: nextStopId } : undefined;
  const allGood = practised.length > 0 && practised.every((event) => event.outcome === "success");
  // The ring is the share of the block you got: a solid topic counts whole, a partly-there one half.
  const credit = practised.length ? practised.reduce((sum, event) => sum + (event.outcome === "success" ? 1 : event.outcome === "partial" ? 0.5 : 0), 0) / practised.length : 0;

  return (
    <>
    {/* The same bar the session had a moment ago: the block ends on its own page, not off the edge of the app. */}
    <header className={styles.bar}>
      <span className={styles.barTitle}>
        <Link href="/" className="study-brand" aria-label="Kelus home"><KelusLogoMark /><span>kelus</span></Link>
        <small><b>{course?.name ?? "Your course"}</b> · block done</small>
      </span>
      <Link href="/today" className={styles.barClose}>Close</Link>
    </header>
    <main id="main" className="study-shell is-complete-page">
      <motion.section
        className={`complete-folio is-page ${styles.done}`}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.12 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <MarkStamp outcome={allGood ? "success" : credit === 0 ? "failure" : "partial"} fill={credit} label={allGood ? "Block done, all solid" : `Block done, ${known.length} of ${practised.length} solid`} />
        <h1>Done.</h1>
        <p className={styles.lede}>
          {practised.length} {practised.length === 1 ? "topic" : "topics"}{course ? ` from ${course.name}` : ""}. Your answers are saved.
        </p>

        {/* What changed, the way a tutor would say it: what you now know, and the one thing to fix next. */}
        <section className={styles.changed} aria-label="What changed">
          <p>
            <span className={styles.changedLabel}>You now know</span>
            {known.length ? <b>{known.map((event) => name(event.conceptId)).join(", ")}</b> : <span className={styles.none}>nothing solid yet, which is normal on a first pass</span>}
          </p>
          {weakest ? (
            <p>
              <span className={styles.changedLabel}>Your weak spot</span>
              <b>{name(weakest.conceptId)}</b>
              <span className={styles.none}>{nextStopId === weakest.conceptId ? " · it’s first next time" : " · its missed lines open tomorrow’s warm-up"}</span>
            </p>
          ) : null}
        </section>

        <ul className={styles.topics} aria-label="Topics in this block">
          {practised.map((event, index) => (
            <motion.li
              key={event.conceptId}
              className={styles[event.outcome ?? "partial"]}
              initial={reduceMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.12 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={styles.mark} aria-hidden="true">{event.outcome === "success" ? "✓" : event.outcome === "partial" ? <HalfDot /> : "↻"}</span>
              <strong>{name(event.conceptId)}</strong>
              <span className={styles.word}>{OUTCOME[event.outcome ?? "partial"]}</span>
            </motion.li>
          ))}
        </ul>

        <HabitStrip events={state.snapshot.events} concepts={courseConcepts} compact />

        <section className={styles.tomorrow} aria-labelledby="complete-return-title">
          <PackArt name="time-flies" className={styles.art} size={120} />
          <div>
            <p className="kicker">Come back tomorrow</p>
            <h2 id="complete-return-title">
              {missedToday
                ? missedToday <= 3
                  ? <>{missedToday === 1 ? "The line you missed comes" : `The ${missedToday} lines you missed come`} back as a 1-minute warm-up.</>
                  : <>Tomorrow starts with a 1-minute warm-up on lines you missed, three at a time.</>
                : nextFresh ? <>Next time, start with <strong>{name(nextFresh.conceptId)}</strong>.</> : "Your plan is saved for next time."}
            </h2>
            {missedToday > 3 ? <p>{missedToday} lines are saved for it.</p> : null}
            {missedToday && nextFresh ? <p>Then {name(nextFresh.conceptId)}, a topic you haven’t done yet.</p> : null}
            <button type="button" className={`text-btn ${styles.calendar}`} onClick={addCalendar}>
              Add tomorrow to calendar <span aria-hidden="true">→</span>
            </button>
            {calendarNote ? <p className={styles.note} role="status">{calendarNote}</p> : null}
          </div>
        </section>

        <Link href="/today" className={`cta ${styles.primary}`} onClick={() => trackEvent({ name: "next_route_opened", source: "completion" })}>
          Back to Today <span aria-hidden="true">→</span>
        </Link>

        <div className={styles.quiet}>
          {usefulness === null ? (
            <p role="group" aria-label="Rate study usefulness">
              Was this useful?{" "}
              <button type="button" onClick={() => { setUsefulness(true); trackEvent({ name: "session_usefulness_rated", helpful: true }); }}>Yes</button>{" · "}
              <button type="button" onClick={() => { setUsefulness(false); trackEvent({ name: "session_usefulness_rated", helpful: false }); }}>Not yet</button>
            </p>
          ) : <p role="status">{usefulness ? "Thanks. Good to know." : "Thanks. That helps make it better."}</p>}
          {completedSessions === 1 ? (
            <details>
              <summary>Support through exam day</summary>
              <SoftUpgradePrompt moment="first_session" />
            </details>
          ) : null}
          {completedSessions >= 2 ? (
            <details className="complete-waitlist">
              <summary>Get product updates</summary>
              <WaitlistForm source="session_complete" compact />
            </details>
          ) : null}
        </div>
      </motion.section>
    </main>
    </>
  );
}

export default function SessionCompletePage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="study-shell is-complete-page">
          <p>Updating your route…</p>
        </main>
      }
    >
      <CompleteBody />
    </Suspense>
  );
}
