"use client";

import { useId, useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { isValidQuestionEmail, submitClientQuestion } from "@/lib/questions";
import { QUESTIONS_UPDATED_EVENT } from "@/components/QuestionsExport";

export function QuestionsForm({ source = "questions" }: { source?: string }) {
  const formId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "local" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setStatus("error");
      setMessage("Enter your name so we know who to reply to.");
      return;
    }
    if (!isValidQuestionEmail(email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (question.trim().length < 8) {
      setStatus("error");
      setMessage("Write a short question — a sentence is enough.");
      return;
    }

    setStatus("saving");
    setMessage("");
    const result = await submitClientQuestion({ name, email, question, source });
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    trackEvent({ name: "question_submitted", source });
    window.dispatchEvent(new Event(QUESTIONS_UPDATED_EVENT));
    if (result.delivery === "local") {
      setStatus("local");
      setMessage(
        "Couldn’t reach the Kelus inbox just now. Your question is saved on this device — download the backup below or email hello@kelus.me if you need a reply today.",
      );
    } else {
      setStatus("saved");
      setMessage("Got it. We’ll reply to your email when we can.");
      setName("");
      setEmail("");
      setQuestion("");
    }
  }

  function clearFeedback() {
    if (status !== "idle" && status !== "saving") {
      setStatus("idle");
      setMessage("");
    }
  }

  return (
    <form className="questions-form waitlist-form" onSubmit={onSubmit} noValidate>
      <div className="waitlist-fields">
        <div>
          <label htmlFor={`${formId}-name`}>Name</label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFeedback();
            }}
            placeholder="Your name"
            disabled={status === "saving"}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-email`}>Email</label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFeedback();
            }}
            placeholder="you@university.edu"
            disabled={status === "saving"}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${formId}-question`}>Your question</label>
        <textarea
          id={`${formId}-question`}
          name="question"
          required
          rows={5}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            clearFeedback();
          }}
          placeholder="Ask about today’s route, materials, Exam Pass, or anything unclear…"
          disabled={status === "saving"}
          maxLength={2000}
        />
      </div>
      <button
        className="cta"
        type="submit"
        disabled={status === "saving" || !name.trim() || !email.trim() || !question.trim()}
      >
        {status === "saving" ? "Sending…" : "Send question"}
        <span aria-hidden="true">→</span>
      </button>
      <p
        className={status === "error" || status === "local" ? "waitlist-message is-error" : "waitlist-message"}
        role={status === "error" ? "alert" : status === "saved" || status === "local" ? "status" : undefined}
        aria-live="polite"
      >
        {message ||
          "Questions go to hello@kelus.me. We reply by email — no public comment thread."}
      </p>
    </form>
  );
}
