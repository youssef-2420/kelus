"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SetupInput } from "@/lib/setup";
import { trackEvent } from "@/lib/analytics";
import { isPdfFile } from "@/domain/materials";

const TIMES = [15, 30, 45, 60] as const;

type FieldKey = "courseName" | "examName" | "examDate" | "targetPercent" | "form";

export function FirstRunSetup({ onComplete, onStageChange }: {
  onComplete: (input: SetupInput, file: File) => Promise<void>;
  onStageChange: (stage: "upload" | "exam") => void;
}) {
  const [draft, setDraft] = useState<SetupInput>({ courseName: "", examName: "", examDate: "", targetPercent: 85, availableMinutes: 45 });
  const [stage, setStage] = useState<"upload" | "exam">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [minimumDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const setupTracked = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (setupTracked.current) return;
    setupTracked.current = true;
    trackEvent({ name: "setup_started" });
  }, []);

  function fail(field: FieldKey, message: string) {
    setErrorField(field);
    setError(message);
  }

  function chooseFile(next: File | undefined) {
    setDragging(false);
    if (!next) return;
    if (!isPdfFile(next)) return fail("form", "Choose a PDF, not another file type.");
    if (next.size > 20 * 1024 * 1024) return fail("form", "This PDF is over 20 MB. Choose a smaller export or split it first.");
    setFile(next);
    setError("");
    setErrorField(null);
  }

  function dropFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  }

  function changeStage(next: "upload" | "exam") {
    setStage(next);
    onStageChange(next);
    setError("");
    setErrorField(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setErrorField(null);
    if (!file) return fail("form", "Choose a syllabus, lecture, or notes PDF to begin.");
    if (stage === "upload") {
      changeStage("exam");
      return;
    }
    if (!draft.courseName.trim()) return fail("courseName", "Tell Kelus which course you are studying.");
    if (!draft.examName.trim()) return fail("examName", "Tell Kelus what you are working toward.");
    if (!draft.examDate) return fail("examDate", "Choose the date of your exam.");
    if (draft.targetPercent < 50 || draft.targetPercent > 100) {
      return fail("targetPercent", "Choose a target between 50% and 100%.");
    }
    setSubmitting(true);
    try {
      await onComplete(draft, file);
      trackEvent({ name: "setup_completed", available_minutes: draft.availableMinutes });
    } catch (caught) {
      fail("form", caught instanceof Error ? caught.message : "Kelus could not set up your exam yet.");
      setSubmitting(false);
    }
  }

  return (
    <div className="destination-page is-booklet-product is-marked-setup is-material-first">
      <form className="destination-form" onSubmit={submit} noValidate>
        {stage === "upload" ? (
          <motion.div
            key="upload-stage"
            className="setup-stage-content"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.42 }}
          >
            <p className="kicker">First, your material</p>
            <h1 className="destination-page-title">Add a course PDF.</h1>
            <p className="destination-support">Upload a syllabus, lecture slides, or notes. You’ll review the topics Kelus finds before they shape your plan.</p>
            <label
              className={`setup-first-upload${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropFile}
            >
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => chooseFile(event.target.files?.[0])} aria-describedby="setup-file-help" />
              <span className="setup-upload-mark" aria-hidden="true">↑</span>
              <strong>{file ? file.name : "Choose a PDF"}</strong>
              <span>{file ? `${(file.size / 1_000_000).toFixed(1)} MB · Choose another file if needed` : "or drop it here"}</span>
            </label>
            <p id="setup-file-help" className="setup-file-help">PDF up to 20 MB. Digital PDFs with selectable text work best. Videos and web links can be saved later, but don’t create topics.</p>
            {file ? <p className="setup-file-ready" role="status" aria-live="polite"><strong>Ready to read</strong><span>{file.name} · {(file.size / 1_000_000).toFixed(1)} MB</span></p> : null}
            <p className="setup-privacy-note">Your course stays on this device unless you choose free sign-in to sync it across devices. You review every proposed topic before it changes your route.</p>
          </motion.div>
        ) : (
          <motion.div
            key="exam-stage"
            className="setup-stage-content"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.42 }}
          >
        <p className="kicker">Next, your exam</p>
        <h1 className="destination-page-title">Set your exam</h1>
        <p className="destination-support">Your PDF is selected. Add the exam date so Kelus can prioritize the topics you confirm.</p>
        <div className="setup-section setup-source-section">
          <div className="setup-selected-file"><span>PDF selected</span><strong>{file?.name}</strong><button type="button" className="text-btn" onClick={() => changeStage("upload")}>Change</button></div>
        </div>
        <fieldset disabled={submitting}>
          <legend>Tell Kelus what you are preparing for</legend>
          <div className="setup-section setup-exam-section">
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
                  placeholder="Microeconomics"
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
          </div>
          <div className="setup-section setup-rhythm-section">
            <p className="destination-support" id="time-support">Usual study block</p>
            <div className="time-choices" role="radiogroup" aria-labelledby="time-support">
              {TIMES.map((minutes) => (
                <label key={minutes} className={draft.availableMinutes === minutes ? "is-selected" : undefined}>
                  <input type="radio" name="minutes" checked={draft.availableMinutes === minutes} onChange={() => setDraft({ ...draft, availableMinutes: minutes })} />
                  <strong>{minutes === 60 ? "60+" : minutes}</strong><span>min</span>
                </label>
              ))}
            </div>
            <p id="course-support" className="destination-support">Use the names you use at school. Your PDF supplies the topics next.</p>
          </div>
        </fieldset>
          </motion.div>
        )}
        {error ? <p id="setup-error" className="setup-error" role="alert">{error}</p> : null}
        <div className="destination-actions">
          {stage === "exam" ? <button type="button" className="text-btn setup-back" onClick={() => changeStage("upload")}>Back to PDF</button> : <span className="destination-actions-spacer" />}
          <button className="cta" type="submit" disabled={submitting}>
            {submitting ? "Setting up…" : stage === "upload" ? "Continue to exam details" : "Read my PDF"} <span aria-hidden="true">→</span>
          </button>
        </div>
        {stage === "upload" ? (
          <ul className="setup-payoff" aria-label="What happens after upload">
            {[
              ["Topics", "Review what Kelus found in your pages."],
              ["First check", "Show what you can already recall."],
              ["Study plan", "Start with the topic that needs you most."],
            ].map(([title, detail]) => (
              <li key={title}><strong>{title}</strong><span>{detail}</span></li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
