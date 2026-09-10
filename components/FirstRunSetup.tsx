"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SetupInput } from "@/lib/setup";
import { trackEvent } from "@/lib/analytics";

const TIMES = [15, 30, 45, 60] as const;

type FieldKey = "courseName" | "examName" | "examDate" | "targetPercent" | "form";

export function FirstRunSetup({ onComplete, onUseDemo }: { onComplete: (input: SetupInput) => void; onUseDemo: () => void }) {
  const [draft, setDraft] = useState<SetupInput>({ courseName: "", examName: "", examDate: "", targetPercent: 85, availableMinutes: 45 });
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [minimumDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const setupTracked = useRef(false);

  useEffect(() => {
    if (setupTracked.current) return;
    setupTracked.current = true;
    trackEvent({ name: "setup_started" });
  }, []);

  function fail(field: FieldKey, message: string) {
    setErrorField(field);
    setError(message);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setErrorField(null);
    if (!draft.courseName.trim()) return fail("courseName", "Tell Kelus which course you are studying.");
    if (!draft.examName.trim()) return fail("examName", "Tell Kelus what you are working toward.");
    if (!draft.examDate) return fail("examDate", "Choose the date of your exam.");
    if (draft.targetPercent < 50 || draft.targetPercent > 100) {
      return fail("targetPercent", "Choose a target between 50% and 100%.");
    }
    setSubmitting(true);
    try {
      onComplete(draft);
      trackEvent({ name: "setup_completed", available_minutes: draft.availableMinutes });
    } catch (caught) {
      fail("form", caught instanceof Error ? caught.message : "Kelus could not set up your exam yet.");
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="destination-page is-notion-product">
      <form className="destination-form" onSubmit={submit} noValidate>
        <p className="kicker">Your exam</p>
        <h1 className="destination-page-title">Set your exam</h1>
        <p className="destination-support">Choose the course you want to revise. Next, add your lessons and start practising what you remember.</p>
        <ol className="setup-progress" aria-label="Getting started">
          <li aria-current="step"><span>01</span>Exam</li>
          <li><span>02</span>Lessons</li>
          <li><span>03</span>Quick check</li>
          <li><span>04</span>Today</li>
        </ol>
        <fieldset disabled={submitting}>
          <legend>Tell Kelus what you are preparing for</legend>
          <div className="destination-course-fields">
            <label htmlFor="course-name">
              Course
              <input
                id="course-name"
                autoFocus
                value={draft.courseName}
                onChange={(event) => {
                  setDraft({ ...draft, courseName: event.target.value });
                  if (errorField === "courseName") {
                    setError("");
                    setErrorField(null);
                  }
                }}
                placeholder="Molecular Biology"
                aria-describedby={errorField === "courseName" ? "setup-error" : "course-support"}
                aria-invalid={errorField === "courseName" || undefined}
              />
            </label>
            <label htmlFor="exam-name">
              Exam
              <input
                id="exam-name"
                value={draft.examName}
                onChange={(event) => {
                  setDraft({ ...draft, examName: event.target.value });
                  if (errorField === "examName") {
                    setError("");
                    setErrorField(null);
                  }
                }}
                placeholder="Final exam"
                aria-describedby={errorField === "examName" ? "setup-error" : "course-support"}
                aria-invalid={errorField === "examName" || undefined}
              />
            </label>
          </div>
          <div className="destination-pair">
            <label htmlFor="exam-date">
              When is it?
              <input
                id="exam-date"
                className="destination-date"
                type="date"
                min={minimumDate}
                value={draft.examDate}
                onChange={(event) => {
                  setDraft({ ...draft, examDate: event.target.value });
                  if (errorField === "examDate") {
                    setError("");
                    setErrorField(null);
                  }
                }}
                aria-describedby={errorField === "examDate" ? "setup-error" : undefined}
                aria-invalid={errorField === "examDate" || undefined}
              />
            </label>
            <label htmlFor="exam-target">
              Aim
              <span className="target-input">
                <input
                  id="exam-target"
                  type="number"
                  min="50"
                  max="100"
                  value={draft.targetPercent}
                  onChange={(event) => {
                    setDraft({ ...draft, targetPercent: Number(event.target.value) });
                    if (errorField === "targetPercent") {
                      setError("");
                      setErrorField(null);
                    }
                  }}
                  aria-describedby={errorField === "targetPercent" ? "setup-error" : undefined}
                  aria-invalid={errorField === "targetPercent" || undefined}
                />
                <b>%</b>
              </span>
            </label>
          </div>
          <p className="destination-support" id="time-support">Usual study block</p>
          <div className="time-choices" role="radiogroup" aria-labelledby="time-support">
            {TIMES.map((minutes) => (
              <label key={minutes} className={draft.availableMinutes === minutes ? "is-selected" : undefined}>
                <input type="radio" name="minutes" checked={draft.availableMinutes === minutes} onChange={() => setDraft({ ...draft, availableMinutes: minutes })} />
                <strong>{minutes === 60 ? "60+" : minutes}</strong><span>MIN</span>
              </label>
            ))}
          </div>
          <p id="course-support" className="destination-support">Use the names you use at school. Your PDF supplies the topics next.</p>
        </fieldset>
        <p id="setup-error" className="setup-error" {...(error ? { role: "alert" } : { "aria-live": "polite" })}>{error || "\u00a0"}</p>
        <div className="destination-actions">
          <span className="destination-actions-spacer" />
          <button className="cta" type="submit" disabled={submitting}>
            {submitting ? "Setting up…" : "Continue with my course"} <span aria-hidden="true">→</span>
          </button>
        </div>
        <aside className="setup-sample" aria-label="Fastest way to try Kelus">
          <div>
            <p className="kicker">Just looking?</p>
            <p>Open a finished sample course and see a real revision route before adding your own lessons.</p>
          </div>
          <button type="button" className="text-btn setup-sample-cta" onClick={onUseDemo} disabled={submitting}>
            Try sample (~1 min) <span aria-hidden="true">→</span>
          </button>
        </aside>
      </form>
    </main>
  );
}
