"use client";

import { useState, type FormEvent } from "react";
import type { SetupInput } from "@/lib/setup";

const TIMES = [15, 30, 45, 60] as const;

export function FirstRunSetup({ onComplete, onUseDemo }: { onComplete: (input: SetupInput) => void; onUseDemo: () => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SetupInput>({ courseName: "", examName: "", examDate: "", targetPercent: 85, availableMinutes: 45 });
  const [error, setError] = useState("");
  const [minimumDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  function next(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step === 1 && !draft.courseName.trim()) return setError("Tell Kelus which course you are studying.");
    if (step === 1 && !draft.examName.trim()) return setError("Tell Kelus what you are working toward.");
    if (step === 2 && !draft.examDate) return setError("Choose the date of your exam.");
    if (step < 3) return setStep((current) => current + 1);
    try {
      onComplete(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kelus could not set up your exam yet.");
    }
  }

  return (
    <main id="main" className="destination-page">
      <form className="destination-form" onSubmit={next}>
        <p className="destination-brand">Kelus</p>
        <h1 className="destination-page-title">Set your exam</h1>
        <div className="flow-context" aria-live="polite">
          <span>Step</span>
          <b>
            {step} / 3
          </b>
        </div>
        {step === 1 ? (
          <aside className="setup-sample is-primary" aria-label="Fastest way to try Kelus">
            <div>
              <p className="kicker">Fastest path</p>
              <p>Skip the PDF. Load a finished sample course and open Today in under a minute.</p>
            </div>
            <button type="button" className="cta setup-sample-cta" onClick={onUseDemo}>
              Try sample (~1 min) <span aria-hidden="true">→</span>
            </button>
          </aside>
        ) : null}
        {step === 1 ? (
          <fieldset>
            <legend>Or set up your real exam</legend>
            <div className="destination-course-fields">
              <label htmlFor="course-name">Course<input id="course-name" autoFocus value={draft.courseName} onChange={(event) => setDraft({ ...draft, courseName: event.target.value })} placeholder="Molecular Biology" aria-describedby="course-support" /></label>
              <label htmlFor="exam-name">Exam<input id="exam-name" value={draft.examName} onChange={(event) => setDraft({ ...draft, examName: event.target.value })} placeholder="Final exam" aria-describedby="course-support" /></label>
            </div>
            <p id="course-support" className="destination-support">Use the names you use at school. Your PDF will supply the actual topics next.</p>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <fieldset>
            <legend>Set the exam.</legend>
            <div className="destination-pair">
              <label htmlFor="exam-date">
                When is it?
                <input
                  id="exam-date"
                  className="destination-date"
                  autoFocus
                  type="date"
                  min={minimumDate}
                  value={draft.examDate}
                  onChange={(event) => setDraft({ ...draft, examDate: event.target.value })}
                />
              </label>
              <label htmlFor="exam-target">
                What are you aiming for?
                <span className="target-input">
                  <input
                    id="exam-target"
                    type="number"
                    min="50"
                    max="100"
                    value={draft.targetPercent}
                    onChange={(event) => setDraft({ ...draft, targetPercent: Number(event.target.value) })}
                  />
                  <b>%</b>
                </span>
              </label>
            </div>
          </fieldset>
        ) : null}
        {step === 3 ? (
          <fieldset>
            <legend>How much time can you usually study?</legend>
            <div className="time-choices">
              {TIMES.map((minutes) => (
                <label key={minutes} className={draft.availableMinutes === minutes ? "is-selected" : undefined}>
                  <input type="radio" name="minutes" checked={draft.availableMinutes === minutes} onChange={() => setDraft({ ...draft, availableMinutes: minutes })} />
                  <strong>{minutes === 60 ? "60+" : minutes}</strong><span>MIN</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <p className="setup-error" {...(error ? { role: "alert" } : { "aria-live": "polite" })}>{error || "\u00a0"}</p>
        <div className="destination-actions">
          {step > 1 ? <button type="button" className="text-btn" onClick={() => setStep((current) => current - 1)}>Back</button> : <span className="destination-actions-spacer" />}
          <button className={step === 1 ? "ghost" : "cta"} type="submit">{step === 3 ? "Add course material" : step === 1 ? "Continue with my course" : "Continue"}<span aria-hidden="true">→</span></button>
        </div>
      </form>
      <div className="destination-route" aria-hidden="true"><i /><i /><i /><b>◎</b></div>
    </main>
  );
}
