"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { StudentIllustration } from "@/components/hero/StudentIllustration";
import { kelusMotion } from "@/components/motion";
import type { SetupInput } from "@/lib/setup";
import { trackEvent } from "@/lib/analytics";

const TIMES = [15, 30, 45, 60] as const;

export function FirstRunSetup({ onComplete, onUseDemo }: { onComplete: (input: SetupInput) => void; onUseDemo: () => void }) {
  const reduce = useReducedMotion() === true;
  const [draft, setDraft] = useState<SetupInput>({ courseName: "", examName: "", examDate: "", targetPercent: 85, availableMinutes: 45 });
  const [error, setError] = useState("");
  const [minimumDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const setupTracked = useRef(false);

  useEffect(() => {
    if (setupTracked.current) return;
    setupTracked.current = true;
    trackEvent({ name: "setup_started" });
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!draft.courseName.trim()) return setError("Tell Kelus which course you are studying.");
    if (!draft.examName.trim()) return setError("Tell Kelus what you are working toward.");
    if (!draft.examDate) return setError("Choose the date of your exam.");
    try {
      onComplete(draft);
      trackEvent({ name: "setup_completed", available_minutes: draft.availableMinutes });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kelus could not set up your exam yet.");
    }
  }

  return (
    <main id="main" className="destination-page is-staged">
      <div className="destination-atmosphere" aria-hidden="true">
        <span className="destination-atmosphere-mist" />
        <span className="destination-atmosphere-wash" />
      </div>

      <form className="destination-form" onSubmit={submit}>
        <motion.div
          className="destination-copy"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={kelusMotion.reveal}
        >
          <p className="destination-brand">Kelus</p>
          <h1 className="destination-page-title">Set your exam</h1>
          <p className="destination-support">
            Choose the course you want to revise. Next, add your lessons and start practising what you remember.
          </p>

          <aside className="setup-sample is-primary surface-raised" aria-label="Fastest way to try Kelus">
            <div>
              <p className="kicker">Fastest path</p>
              <p>Skip the PDF. Load a finished sample course and open Today in under a minute.</p>
            </div>
            <motion.button
              type="button"
              className="cta setup-sample-cta"
              onClick={onUseDemo}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={kelusMotion.press}
            >
              Try sample (~1 min) <span aria-hidden="true">→</span>
            </motion.button>
          </aside>

          <fieldset>
            <legend>Or set up your real exam in one step</legend>
            <div className="destination-course-fields">
              <label htmlFor="course-name">
                Course
                <input
                  id="course-name"
                  autoFocus
                  value={draft.courseName}
                  onChange={(event) => setDraft({ ...draft, courseName: event.target.value })}
                  placeholder="Molecular Biology"
                  aria-describedby="course-support"
                />
              </label>
              <label htmlFor="exam-name">
                Exam
                <input
                  id="exam-name"
                  value={draft.examName}
                  onChange={(event) => setDraft({ ...draft, examName: event.target.value })}
                  placeholder="Final exam"
                  aria-describedby="course-support"
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
                  onChange={(event) => setDraft({ ...draft, examDate: event.target.value })}
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
                    onChange={(event) => setDraft({ ...draft, targetPercent: Number(event.target.value) })}
                  />
                  <b>%</b>
                </span>
              </label>
            </div>
            <p className="destination-support" id="time-support">
              Usual study block
            </p>
            <div className="time-choices" role="radiogroup" aria-labelledby="time-support">
              {TIMES.map((minutes) => (
                <label key={minutes} className={draft.availableMinutes === minutes ? "is-selected" : undefined}>
                  <input
                    type="radio"
                    name="minutes"
                    checked={draft.availableMinutes === minutes}
                    onChange={() => setDraft({ ...draft, availableMinutes: minutes })}
                  />
                  <strong>{minutes === 60 ? "60+" : minutes}</strong>
                  <span>MIN</span>
                </label>
              ))}
            </div>
            <p id="course-support" className="destination-support">
              Use the names you use at school. Your PDF supplies the topics next.
            </p>
          </fieldset>

          <p className="setup-error" {...(error ? { role: "alert" } : { "aria-live": "polite" })}>
            {error || "\u00a0"}
          </p>
          <div className="destination-actions">
            <span className="destination-actions-spacer" />
            <motion.button
              className="cta"
              type="submit"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={kelusMotion.press}
            >
              Continue with my course <span aria-hidden="true">→</span>
            </motion.button>
          </div>
        </motion.div>
      </form>

      <aside className="destination-stage" aria-hidden="true">
        <div className="destination-stage-panel surface-raised">
          <p className="kicker">Before the exam</p>
          <p className="destination-stage-line">A short daily route beats a long cram.</p>
          <StudentIllustration className="destination-stage-art" />
        </div>
      </aside>
    </main>
  );
}
