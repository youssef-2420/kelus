"use client";

import { FormEvent, useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Authentication is not configured."); setBusy(false); return; }
    const { error: authError } = await client.auth.updateUser({ password });
    if (authError) setError(authError.message); else setDone(true);
    setBusy(false);
  }
  return <main className="app-page"><KelusHeader/><section className="auth-page section"><div className="signin-dialog is-page"><p className="eyebrow">Secure account recovery</p><h1>{done ? "Password updated" : "Choose a new password"}</h1>{done ? <><p className="dialog-copy">Your password has been changed successfully.</p><a className="button button-primary dialog-submit" href="/">Continue to Kelus <Icon name="arrow" size={17}/></a></> : <form onSubmit={submit}><p className="dialog-copy">Enter a new password for your Kelus account.</p><label>New password<input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy}/></label>{error && <p className="auth-message is-error" role="alert">{error}</p>}<button className="button button-primary dialog-submit" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}<Icon name="arrow" size={17}/></button></form>}</div></section></main>;
}
