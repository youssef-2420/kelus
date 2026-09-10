"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { isValidQuestionEmail, questionsInboxEmail, submitClientQuestion } from "@/lib/questions";
import { QUESTIONS_UPDATED_EVENT } from "@/components/QuestionsExport";

function buildMailto(name: string, email: string, question: string) {
  const subject = encodeURIComponent(name.trim() ? `Kelus question from ${name.trim()}` : "Kelus question");
  const body = encodeURIComponent(
    [
      question.trim() || "(Write your question here)",
      "",
      `Name: ${name.trim() || "(your name)"}`,
      `Reply-to: ${email.trim() || "(your email)"}`,
      "Source: kelus.me/questions",
    ].join("\n"),
  );
  return `mailto:${questionsInboxEmail()}?subject=${subject}&body=${body}`;
}

export function QuestionsForm({ source = "questions" }: { source?: string }) {
  const formId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "local" | "needs_activation" | "error">("idle");
  const [message, setMessage] = useState("");
  const mailtoHref = useMemo(() => buildMailto(name, email, question), [name, email, question]);

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

    trackEvent({ name: "question_submitted", source, delivery: result.delivery });
    window.dispatchEvent(new Event(QUESTIONS_UPDATED_EVENT));
    if (result.delivery === "needs_activation" || result.delivery === "local") {
      setStatus(result.delivery === "needs_activation" ? "needs_activation" : "local");
      setMessage(
        result.delivery === "needs_activation"
          ? "Saved on this device, but the browser inbox path still needs activation on our side. Use Email hello@kelus.me below for a guaranteed reply."
          : "Couldn’t reach the browser inbox just now. Your question is saved here — use Email hello@kelus.me below for a guaranteed reply.",
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

  const promoteMailto = status === "local" || status === "needs_activation";

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
      <div className="questions-actions">
        <a
          className={promoteMailto ? "cta" : "text-btn questions-mailto-cta"}
          href={mailtoHref}
          onClick={() => trackEvent({ name: "question_submitted", source: `${source}_mailto`, delivery: "local" })}
        >
          Email hello@kelus.me <span aria-hidden="true">→</span>
        </a>
        <button
          className={promoteMailto ? "text-btn" : "cta"}
          type="submit"
          disabled={status === "saving" || !name.trim() || !email.trim() || !question.trim()}
        >
          {status === "saving" ? "Sending…" : "Send in browser"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p
        className={
          status === "error"
            ? "waitlist-message is-error"
            : status === "local" || status === "needs_activation"
              ? "waitlist-message is-local"
              : "waitlist-message"
        }
        role={status === "error" ? "alert" : status === "saved" || status === "local" || status === "needs_activation" ? "status" : undefined}
        aria-live="polite"
      >
        {message ||
          "Email hello@kelus.me is the guaranteed path. Send in browser also keeps a local backup."}
      </p>
    </form>
  );
}
