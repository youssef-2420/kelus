"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "create" | "forgot" | "reset";

export function SignInDialog() {
  const { configured, loading: authLoading, user, recovery, clearRecovery } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (recovery) queueMicrotask(() => { setMode("reset"); setOpen(true); setNotice(""); setError(""); });
  }, [recovery]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  function openDialog() { setMode("signin"); setNotice(""); setError(""); setPassword(""); setOpen(true); }
  function switchMode(next: Mode) { setMode(next); setNotice(""); setError(""); setPassword(""); }
  function closeDialog() { setOpen(false); if (mode === "reset") clearRecovery(); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Authentication is not configured yet."); return; }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setOpen(false);
      } else if (mode === "create") {
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/?verified=1` } });
        if (authError) throw authError;
        if (data.session) setOpen(false);
        else setNotice("Check your email to verify your account, then return to Kelus to sign in.");
      } else if (mode === "forgot") {
        const { error: authError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
        if (authError) throw authError;
        setNotice("Password reset instructions have been sent if an account exists for this email.");
      } else {
        const { error: authError } = await client.auth.updateUser({ password });
        if (authError) throw authError;
        setNotice("Your password has been updated. You can continue using Kelus.");
        clearRecovery();
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication could not be completed.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    const client = getSupabaseBrowserClient();
    setMenuOpen(false);
    if (client) await client.auth.signOut();
  }

  if (authLoading) return <button type="button" className="header-signin" disabled aria-label="Checking account"><span className="auth-spinner"/> Account</button>;

  if (user) return <div className="account-menu" ref={menuRef}>
    <button type="button" className="header-signin account-trigger" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span className="account-avatar">{(user.email?.[0] ?? "K").toUpperCase()}</span><span className="account-email">{user.email}</span><Icon name="chevron" size={14}/></button>
    {menuOpen && <div className="account-panel"><p><b>Signed in</b><span>{user.email}</span></p><Link href="/alerts" onClick={() => setMenuOpen(false)}><Icon name="bell" size={16}/>My Alerts</Link><button type="button" onClick={signOut}><Icon name="lock" size={16}/>Sign out</button></div>}
  </div>;

  return <><button type="button" className="header-signin" onClick={openDialog}><Icon name="lock" size={17}/>Sign in</button>
    {open && <div className="modal-backdrop"><section className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title"><button className="modal-close" type="button" onClick={closeDialog} aria-label="Close sign in"><Icon name="close" size={20}/></button>
      <p className="eyebrow">Welcome to Kelus</p><h2 id="signin-title">{mode === "signin" ? "Sign in to your account" : mode === "create" ? "Create your Kelus account" : mode === "forgot" ? "Reset your password" : "Choose a new password"}</h2>
      <p className="dialog-copy">{mode === "forgot" ? "We’ll send a secure reset link to your email." : mode === "reset" ? "Enter a new password for your Kelus account." : "Save price alerts and keep your shopping decisions in one place."}</p>
      {!configured && <p className="auth-message is-error" role="alert">Supabase setup is required before sign-in can be used.</p>}
      {mode !== "forgot" && mode !== "reset" && <div className="signin-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>Sign in</button><button type="button" className={mode === "create" ? "active" : ""} onClick={() => switchMode("create")}>Create account</button></div>}
      <form onSubmit={submit}>
        {mode !== "reset" && <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={busy}/></label>}
        {mode !== "forgot" && <label>{mode === "reset" ? "New password" : "Password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required disabled={busy}/></label>}
        {mode === "signin" && <button className="forgot-link" type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>}
        {error && <p className="auth-message is-error" role="alert">{error}</p>}{notice && <p className="auth-message is-success" role="status">{notice}</p>}
        <button className="button button-primary dialog-submit" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "create" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}<Icon name="arrow" size={17}/></button>
      </form>
      {(mode === "forgot" || mode === "reset") && !notice && <button className="auth-back" type="button" onClick={() => switchMode("signin")}>Back to sign in</button>}
      <p className="dialog-legal">Authentication is securely handled by Supabase. Kelus never stores your password.</p>
    </section></div>}
  </>;
}
