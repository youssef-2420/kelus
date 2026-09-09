"use client";

import { FormEvent, useEffect, useState } from "react";
import { hasExamPass, redeemExamPass, refreshExamPassStatus, subscribeExamPass } from "@/lib/exam-pass";
import { trackEvent } from "@/lib/analytics";
import { useSyncExternalStore } from "react";

export function ExamPassRedeem() {
  const unlocked = useSyncExternalStore(subscribeExamPass, hasExamPass, () => false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshExamPassStatus();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await redeemExamPass({
      code: code || undefined,
      email: email || undefined,
      sessionId: sessionId || undefined,
    });
    setBusy(false);
    if (result.ok) {
      trackEvent({ name: "exam_pass_activated", source: "redeem_form" });
      setMessage("Exam Pass unlocked on this browser.");
      setCode("");
      setSessionId("");
      return;
    }
    trackEvent({ name: "exam_pass_redeem_failed", source: "redeem_form" });
    setMessage(result.error);
  }

  if (unlocked) {
    return (
      <section id="exam-pass-redeem" className="exam-pass-redeem is-unlocked" aria-labelledby="exam-pass-redeem-title">
        <p className="kicker">Exam Pass</p>
        <h2 id="exam-pass-redeem-title">Unlocked on this browser</h2>
        <p>Named remaining days, calendar file, and printable topic list are available on Today and after a session.</p>
      </section>
    );
  }

  return (
    <section id="exam-pass-redeem" className="exam-pass-redeem" aria-labelledby="exam-pass-redeem-title">
      <p className="kicker">Already paid?</p>
      <h2 id="exam-pass-redeem-title">Unlock Exam Pass</h2>
      <p>
        Unlock is verified by the Kelus edge — not a shareable <code>?pass=1</code> link. Paste a Stripe checkout
        session id from your receipt, or a redeem code from hello@kelus.me.
      </p>
      <form onSubmit={onSubmit} className="exam-pass-redeem-form">
        <label htmlFor="exam-pass-session">
          Stripe checkout session id
          <input
            id="exam-pass-session"
            name="sessionId"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            placeholder="cs_…"
            autoComplete="off"
          />
        </label>
        <label htmlFor="exam-pass-code">
          Redeem code
          <input
            id="exam-pass-code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Optional founder code"
            autoComplete="off"
          />
        </label>
        <label htmlFor="exam-pass-email">
          Email on the receipt
          <input
            id="exam-pass-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
          />
        </label>
        <button className="cta" type="submit" disabled={busy || (!sessionId.trim() && !code.trim())}>
          {busy ? "Checking…" : "Unlock Exam Pass"}
        </button>
      </form>
      {message ? (
        <p className="exam-pass-redeem-status" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
