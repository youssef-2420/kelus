"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeSearchQuery } from "@/lib/normalize-search-query";
import { trackEvent } from "@/services/analytics";

const storageKey = "kelus:product-interest:v1";

function readSavedQueries() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeSavedQuery(query: string) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return;
  const saved = [...new Set([...readSavedQueries(), normalized])].slice(-100);
  window.localStorage.setItem(storageKey, JSON.stringify(saved));
}

async function authHeader() {
  const client = getSupabaseBrowserClient();
  if (!client) return undefined;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : undefined;
}

export async function captureProductInterest(query: string, email?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const auth = await authHeader();
  if (auth?.Authorization) headers.Authorization = auth.Authorization;
  const response = await fetch("/api/product-interest", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, email }),
    keepalive: true,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Could not save your request right now.");
  }
  writeSavedQuery(query);
}

type Props = { query: string };

export function ProductInterestCapture({ query }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(() => {
    const normalized = normalizeSearchQuery(query);
    return normalized ? readSavedQueries().includes(normalized) : false;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event?: FormEvent) {
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

  if (saved) {
    return <p className="product-interest-note">Request saved. We&apos;ll notify you when this product is available on Kelus.</p>;
  }

  return <div className="product-interest-capture">
    <p className="product-interest-prompt">Want Kelus to add this product?</p>
    {user?.email
      ? <button type="button" className="product-interest-submit" disabled={submitting} onClick={() => { void submit(); }}>
        {submitting ? "Saving…" : `Notify me at ${user.email}`}
      </button>
      : <form onSubmit={(event) => { void submit(event); }}>
        <label className="product-interest-field">
          <span className="sr-only">Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email for updates" autoComplete="email" required disabled={submitting}/>
        </label>
        <button type="submit" className="product-interest-submit" disabled={submitting}>{submitting ? "Saving…" : "Notify me"}</button>
      </form>}
    {error ? <p className="product-interest-error" role="alert">{error}</p> : null}
    {!user ? <p className="product-interest-hint">Sign in from the header to sync requests across devices.</p> : null}
  </div>;
}
