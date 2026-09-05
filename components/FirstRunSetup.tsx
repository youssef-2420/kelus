"use client";

import { useState, type FormEvent } from "react";
import type { SetupInput } from "@/lib/setup";

const TIMES = [15, 30, 45, 60] as const;

export function FirstRunSetup({ onComplete, onUseDemo }: { onComplete: (input: SetupInput) => void; onUseDemo: () => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SetupInput>({ examName: "Microeconomics Final", examDate: "", targetPercent: 85, availableMinutes: 45 });
  const [error, setError] = useState("");
  const [minimumDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  function next(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step === 1 && !draft.examName.trim()) return setError("Tell Kelus what you are working toward.");
    if (step === 2 && !draft.examDate) return setError("Choose the date of your exam.");
    if (step < 3) return setStep((current) => current + 1);
    try {
      onComplete(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kelus could not create your destination yet.");
    }
  }

  return (
    <main id="main" className="destination-page">
      <form className="destination-form" onSubmit={next}>
        <div className="flow-context"><span>Set your destination</span><b>{step} / 3</b></div>
        {step === 1 ? (
          <fieldset>
            <legend>What are you working toward?</legend>
            <label className="sr-only" htmlFor="exam-name">Exam</label>
            <input id="exam-name" autoFocus readOnly value={draft.examName} aria-describedby="course-support" />
            <p id="course-support" className="destination-support">Microeconomics is the first supported course.</p>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <fieldset>
            <legend>Define the destination.</legend>
            <div className="destination-pair">
              <label>When is it?<input autoFocus type="date" min={minimumDate} value={draft.examDate} onChange={(event) => setDraft({ ...draft, examDate: event.target.value })} /></label>
              <label>What are you aiming for?<span className="target-input"><input type="number" min="50" max="100" value={draft.targetPercent} onChange={(event) => setDraft({ ...draft, targetPercent: Number(event.target.value) })} /><b>%</b></span></label>
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
        <p className="setup-error" role="alert">{error}</p>
        <div className="destination-actions">
          {step > 1 ? <button type="button" className="text-btn" onClick={() => setStep((current) => current - 1)}>Back</button> : <button type="button" className="text-btn" onClick={onUseDemo}>Open Amina demo</button>}
          <button className="cta" type="submit">{step === 3 ? "Continue to diagnosis" : "Continue"}<span aria-hidden="true">→</span></button>
        </div>
      </form>
      <div className="destination-route" aria-hidden="true"><i /><i /><i /><b>◎</b></div>
    </main>
  );
}
