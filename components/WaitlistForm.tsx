"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { isValidWaitlistEmail, submitWaitlistSignup } from "@/lib/waitlist";

export function WaitlistForm({ source = "waitlist" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "duplicate" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidWaitlistEmail(email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("saving");
    setMessage("");
    const result = await submitWaitlistSignup({ email, note, source });
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    trackEvent({ name: "waitlist_joined", source });
    setStatus(result.duplicate ? "duplicate" : "saved");
    setMessage(
      result.duplicate
        ? "You’re already on the list with this email."
        : "You’re on the list. We’ll only email when there’s something worth reading.",
    );
    if (!result.duplicate) {
      setEmail("");
      setNote("");
    }
  }

  return (
    <form className="waitlist-form" onSubmit={onSubmit} noValidate>
      <div className="waitlist-fields">
        <div>
          <label htmlFor="waitlist-email">Email</label>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status !== "idle" && status !== "saving") {
                setStatus("idle");
                setMessage("");
              }
            }}
            placeholder="you@university.edu"
            disabled={status === "saving"}
          />
        </div>
        <div>
          <label htmlFor="waitlist-note">
            What are you studying? <span>optional</span>
          </label>
          <input
            id="waitlist-note"
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Organic chemistry · midterm in three weeks"
            disabled={status === "saving"}
          />
        </div>
      </div>
      <button className="cta" type="submit" disabled={status === "saving" || !email.trim()}>
        {status === "saving" ? "Joining…" : "Join the waitlist"}
        <span aria-hidden="true">→</span>
      </button>
      <p
        className={status === "error" ? "waitlist-message is-error" : "waitlist-message"}
        role={status === "error" ? "alert" : status === "saved" || status === "duplicate" ? "status" : undefined}
        aria-live="polite"
      >
        {message || "No spam. One quiet list for early access and product notes."}
      </p>
    </form>
  );
}
