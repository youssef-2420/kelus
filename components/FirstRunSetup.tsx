"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import type { Familiarity, SetupInput } from "@/lib/setup";

type Draft = Omit<SetupInput, "topics"> & { topicsText: string };

const initialDraft: Draft = {
  displayName: "",
  courseName: "",
  examName: "Final exam",
  examDate: "",
  topicsText: "",
  familiarity: "new",
};

export function FirstRunSetup({ onComplete }: { onComplete: (input: SetupInput) => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [minimumDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const topics = useMemo(() => draft.topicsText.split(/[\n,]/).map((topic) => topic.trim()).filter(Boolean), [draft.topicsText]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function next(event: FormEvent) {
    event.preventDefault();
    if (step === 1 && (!draft.displayName.trim() || !draft.courseName.trim() || !draft.examName.trim() || !draft.examDate)) {
      setError("Complete the four details to continue.");
      return;
    }
    if (step === 2 && topics.length < 2) {
      setError("Add at least two topics, one per line.");
      return;
    }
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    try {
      onComplete({ ...draft, topics });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t build the route yet.");
    }
  }

  return (
    <main id="main" className="setup-page">
      <header className="setup-header">
        <Link href="/" className="mark">Kelus</Link>
        <span>Step {step} of 3</span>
      </header>

      <div className="setup-layout">
        <section className="setup-copy" aria-labelledby="setup-title">
          <p className="kicker">Your first route</p>
          <h1 id="setup-title">Give Kelus the exam.<br />Keep the next move.</h1>
          <p className="setup-lede">Add what you are preparing for. Kelus will turn it into one focused plan and adapt the order as you practise.</p>
          <div className="setup-inline-illustration" aria-hidden="true">
            <Image src="/illustrations/exam-route.svg" alt="" width={592} height={832} />
          </div>

          <form className="setup-form" onSubmit={next} noValidate>
            {step === 1 ? (
              <div className="setup-fields setup-fields-two">
                <label>First name<input autoComplete="given-name" value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Maya" /></label>
                <label>Course<input value={draft.courseName} onChange={(event) => update("courseName", event.target.value)} placeholder="Behavioral economics" /></label>
                <label>Exam<input value={draft.examName} onChange={(event) => update("examName", event.target.value)} placeholder="Final exam" /></label>
                <label>Exam date<input type="date" min={minimumDate} value={draft.examDate} onChange={(event) => update("examDate", event.target.value)} /></label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="setup-fields">
                <label>Topics<textarea autoFocus rows={8} value={draft.topicsText} onChange={(event) => update("topicsText", event.target.value)} placeholder={"Loss aversion\nFraming\nProspect theory"} /></label>
                <p className="setup-help">One topic per line. Start with 3–12; you can refine the map later.</p>
              </div>
            ) : null}

            {step === 3 ? (
              <fieldset className="setup-levels">
                <legend>Where are you starting?</legend>
                {([
                  ["new", "Starting fresh", "No prior knowledge assumed."],
                  ["familiar", "Some familiarity", "You recognise the ideas but need recall practice."],
                  ["reviewing", "Mostly reviewing", "You have studied these topics before."],
                ] as Array<[Familiarity, string, string]>).map(([value, title, detail]) => (
                  <label key={value} className={draft.familiarity === value ? "is-selected" : undefined}>
                    <input type="radio" name="familiarity" value={value} checked={draft.familiarity === value} onChange={() => update("familiarity", value)} />
                    <span><strong>{title}</strong><small>{detail}</small></span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            <p className="setup-error" role="alert" aria-live="polite">{error}</p>
            <div className="setup-actions">
              {step > 1 ? <button type="button" className="text-btn" onClick={() => { setStep((current) => current - 1); setError(""); }}>Back</button> : <span />}
              <button type="submit" className="cta home-cta">{step === 3 ? "Build my route" : "Continue"}<span className="arrow" aria-hidden="true">→</span></button>
            </div>
          </form>
        </section>

        <figure className="setup-illustration">
          <Image src="/illustrations/exam-route.svg" alt="Course topics following one focused route toward an exam" width={592} height={832} priority />
        </figure>
      </div>
    </main>
  );
}
