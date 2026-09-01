"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { getVariantById } from "@/lib/demo-data";
import { captureProductInterest } from "@/components/ProductInterestCapture";
import { trackEvent } from "@/services/analytics";
import type { SearchCriteria } from "@/types/kelus";
import { WatchButton } from "@/components/WatchButton";

function interestQuery(criteria: SearchCriteria, productName: string) {
  const variant = getVariantById(criteria.variantId);
  const condition = criteria.condition === "any" ? "any condition" : criteria.condition;
  return [productName, variant?.label, condition].filter(Boolean).join(" ");
}

type Props = {
  criteria: SearchCriteria;
  productName: string;
};

export function NotifyWhenLive({ criteria, productName }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const query = interestQuery(criteria, productName);

  async function submitInterest(event?: FormEvent) {
    event?.preventDefault();
    if (submitting || saved) return;
    setSubmitting(true);
    setError("");
    try {
      await captureProductInterest(query, user?.email ?? email);
      trackEvent({ name: "product_interest_captured", query });
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="notify-when-live">
    <div className="notify-when-live-copy">
      <Icon name="bell" size={18} />
      <div>
        <b>Notify me when this configuration is live</b>
        <p>Save a watch now, or leave your email and Kelus will notify you when validated offers appear for this exact setup.</p>
      </div>
    </div>
    <div className="notify-when-live-actions">
      <WatchButton product={productName} criteria={criteria} allowUnavailable />
      {saved
        ? <p className="notify-when-live-saved" role="status">Request saved. We&apos;ll email you when this configuration is ready on Kelus.</p>
        : user?.email
          ? <button type="button" className="button button-secondary" disabled={submitting} onClick={() => { void submitInterest(); }}>
            {submitting ? "Saving…" : `Email me at ${user.email}`}
          </button>
          : <form onSubmit={(event) => { void submitInterest(event); }}>
            <label className="notify-when-live-field">
              <span className="sr-only">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email for updates" autoComplete="email" required disabled={submitting} />
            </label>
            <button type="button" className="button button-secondary" disabled={submitting} onClick={() => { void submitInterest(); }}>
              {submitting ? "Saving…" : "Email me when live"}
            </button>
          </form>}
    </div>
    {error ? <p className="notify-when-live-error" role="alert">{error}</p> : null}
  </div>;
}
