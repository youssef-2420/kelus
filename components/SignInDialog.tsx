"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "create" | "forgot" | "reset";
function GoogleMark() {
  return <svg className="social-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3 7.5l3.4 2.6C7.2 7.7 9.4 5.9 12 5.9Z"/></svg>;
}

export function SignInDialog() {
  const { configured, loading: authLoading, user, recovery, clearRecovery } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        if (mode === "reset") clearRecovery();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [clearRecovery, mode, open]);

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
        const name = fullName.trim();
        if (!name) throw new Error("Enter your full name.");
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/?verified=1`,
          },
        });
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

  async function socialSignIn() {
    setError(""); setNotice(""); setBusy(true);
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Authentication is not configured yet."); setBusy(false); return; }
    try {
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
      });
      if (authError) throw authError;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  if (authLoading) return <button type="button" className="header-signin" disabled aria-label="Checking account"><span className="auth-spinner"/> Account</button>;

  if (user) {
    const storedName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
    const displayName = storedName || user.email || "Kelus account";
    return <div className="account-menu" ref={menuRef}>
      <button type="button" className="header-signin account-trigger" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span className="account-avatar">{displayName[0].toUpperCase()}</span><span className="account-email">{displayName}</span><Icon name="chevron" size={14}/></button>
      {menuOpen && <div className="account-panel"><p><b>{storedName || "Signed in"}</b><span>{user.email}</span></p><Link href="/alerts" onClick={() => setMenuOpen(false)}><Icon name="bell" size={16}/>My Alerts</Link><button type="button" onClick={signOut}><Icon name="lock" size={16}/>Sign out</button></div>}
    </div>;
  }

  return <><button type="button" className="header-signin" onClick={openDialog}><Icon name="lock" size={17}/>Sign in</button>
    {open && <div className="modal-backdrop"><Link href="/" className="auth-brand-mark" aria-label="Return to Kelus homepage" onClick={closeDialog}>kelus</Link><section className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title"><button ref={closeButtonRef} className="modal-close" type="button" onClick={closeDialog} aria-label="Close sign in"><Icon name="close" size={20}/></button>
      <p className="eyebrow">{mode === "create" ? "Start tracking smarter" : mode === "forgot" || mode === "reset" ? "Secure account recovery" : "Welcome back"}</p><h2 id="signin-title">{mode === "signin" ? "Sign in to Kelus" : mode === "create" ? "Create your Kelus account" : mode === "forgot" ? "Reset your password" : "Choose a new password"}</h2>
      <p className="dialog-copy">{mode === "forgot" ? "We’ll send a secure reset link to your email." : mode === "reset" ? "Enter a new password for your Kelus account." : mode === "create" ? "Save exact products, set target prices, and keep your alerts across devices." : "Return to your tracked products and price decisions."}</p>
      {!configured && <p className="auth-message is-error" role="alert">Supabase setup is required before sign-in can be used.</p>}
      <form onSubmit={submit}>
        {mode === "create" && <label>Full name<input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" autoComplete="name" required disabled={busy}/></label>}
        {mode !== "reset" && <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={busy}/></label>}
        {mode !== "forgot" && <label>{mode === "reset" ? "New password" : "Password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required disabled={busy}/></label>}
        {mode === "signin" && <button className="forgot-link" type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>}
        {error && <p className="auth-message is-error" role="alert">{error}</p>}{notice && <p className="auth-message is-success" role="status">{notice}</p>}
        <button className="button button-primary dialog-submit" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "create" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}<Icon name="arrow" size={17}/></button>
      </form>
      {(mode === "signin" || mode === "create") && <><div className="dialog-divider"><span>or continue with</span></div><div className="social-buttons"><button type="button" onClick={socialSignIn} disabled={busy || !configured}><GoogleMark/>Continue with Google</button></div><p className="dialog-legal">Authentication is securely handled by Supabase. Kelus never stores your password.</p><div className="signin-mode-switch"><span>{mode === "signin" ? "New to Kelus?" : "Already have an account?"}</span><button type="button" onClick={() => switchMode(mode === "signin" ? "create" : "signin")}>{mode === "signin" ? "Create account" : "Sign in"}</button></div></>}
      {(mode === "forgot" || mode === "reset") && !notice && <button className="auth-back" type="button" onClick={() => switchMode("signin")}>Back to sign in</button>}
      {(mode === "forgot" || mode === "reset") && <p className="dialog-legal">Authentication is securely handled by Supabase. Kelus never stores your password.</p>}
    </section></div>}
  </>;
}
