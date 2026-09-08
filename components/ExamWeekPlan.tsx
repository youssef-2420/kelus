"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { ExamCoveragePlan } from "@/domain/exam-coverage";
import { examCoverageHeadline } from "@/domain/exam-coverage";
import { foundingPaymentConfigured, foundingPaymentLink } from "@/lib/founding";
import { hasExamPass, subscribeExamPass } from "@/lib/exam-pass";
import { downloadExamWeekIcs, downloadExamWeekSheet } from "@/lib/study-reminder";
import { trackEvent } from "@/lib/analytics";
import { formatDay } from "@/lib/format";

function formatPlanDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

export function ExamWeekPlan({
  plan,
  courseName,
  examTarget,
  examDateIso,
  source = "today",
}: {
  plan: ExamCoveragePlan;
  courseName: string;
  examTarget: string;
  examDateIso: string;
  source?: string;
}) {
  const unlocked = useSyncExternalStore(subscribeExamPass, hasExamPass, () => false);
  const [downloadNote, setDownloadNote] = useState("");
  const headline = examCoverageHeadline(plan);
  const paymentReady = foundingPaymentConfigured();
  const checkoutHref = foundingPaymentLink();

  function downloadCalendar() {
    const ok = downloadExamWeekIcs({
      courseName,
      examTarget,
      days: plan.days,
      todayUrl: "https://kelus.me/today/",
    });
    setDownloadNote(ok ? "Calendar file downloaded for the remaining study days." : "Could not build a calendar file in this browser.");
  }

  function downloadSheet() {
    const ok = downloadExamWeekSheet({
      courseName,
      examTarget,
      examDateIso,
      headline,
      days: plan.days,
      uncoveredNames: plan.uncoveredNames,
    });
    setDownloadNote(ok ? "Printable topic list downloaded." : "Could not build the topic list in this browser.");
  }

  return (
    <section className="exam-week" aria-labelledby="exam-week-title">
      <p className="kicker">Exam week</p>
      <h2 id="exam-week-title">{plan.remainingDays > 0 ? "The remaining days until your exam." : "No remaining days to plan."}</h2>
      <p>{headline} Guidance from your ratings and recall checks — not a grade prediction.</p>
      {plan.days.length ? (
        <ol className="exam-week-days">
          {plan.days.map((day, index) => {
            const locked = !unlocked && index > 0;
            return (
              <li key={day.dateIso} className={locked ? "is-locked" : undefined}>
                <span>{String(day.offset).padStart(2, "0")}</span>
                <div>
                  <strong>{formatPlanDay(day.dateIso)}</strong>
                  {locked ? (
                    <small>{day.stops.length} stop{day.stops.length === 1 ? "" : "s"} · {day.minutes} min</small>
                  ) : (
                    <small>
                      {day.stops.map((stop) => `${stop.name} · ${stop.minutes} min`).join(" · ") || `${day.minutes} min`}
                    </small>
                  )}
                </div>
                <b>{day.minutes} min</b>
              </li>
            );
          })}
        </ol>
      ) : null}
      {unlocked && plan.uncoveredNames.length ? (
        <p className="exam-week-gap">Not scheduled at this pace: {plan.uncoveredNames.join(", ")}.</p>
      ) : null}
      {unlocked ? (
        <div className="exam-week-actions">
          <button type="button" className="cta" onClick={downloadCalendar}>
            Add remaining days to calendar <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="text-btn" onClick={downloadSheet}>
            Download printable list
          </button>
        </div>
      ) : (
        <div className="exam-week-actions">
          {paymentReady ? (
            <a
              className="cta"
              href={checkoutHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({ name: "exam_pass_checkout_clicked", source: `${source}_exam_week` })}
            >
              Unlock remaining days · $9 <span aria-hidden="true">→</span>
            </a>
          ) : (
            <Link className="cta" href="/pricing">
              See Exam Pass <span aria-hidden="true">→</span>
            </Link>
          )}
          <small>Tomorrow’s first stop stays free. Exam Pass names the rest of the days. After checkout, return to Kelus with the success link.</small>
        </div>
      )}
      <p className="exam-week-note" role="status" aria-live="polite">{downloadNote || "\u00a0"}</p>
      <p className="exam-week-meta">{formatDay(examDateIso)} · {courseName}</p>
    </section>
  );
}
