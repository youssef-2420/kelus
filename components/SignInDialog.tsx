"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

export function SignInDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "create">("signin");
  return <><button type="button" className="header-signin" onClick={() => setOpen(true)}><Icon name="lock" size={17} /> Sign in</button>
    {open && <div className="modal-backdrop"><section className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title"><button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close sign in"><Icon name="close" size={20}/></button><p className="eyebrow">Welcome to Kelus</p><h2 id="signin-title">{mode === "signin" ? "Sign in to your account" : "Create your Kelus account"}</h2><p className="dialog-copy">Save price alerts and keep your shopping decisions in one place.</p><div className="signin-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create account</button></div><form onSubmit={(event) => { event.preventDefault(); setOpen(false); }}><label>Email address<input type="email" placeholder="you@example.com" autoComplete="email" required/></label><label>Password<input type="password" placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} required/></label>{mode === "signin" && <button className="forgot-link" type="button">Forgot password?</button>}<button className="button button-primary dialog-submit" type="submit">{mode === "signin" ? "Sign in" : "Create account"}<Icon name="arrow" size={17}/></button></form><div className="dialog-divider"><span>or continue with</span></div><div className="social-buttons"><button type="button"><b>G</b>Google</button><button type="button"><b>●</b>Apple</button></div><p className="dialog-legal">Demo sign-in only — no account or password is stored.</p></section></div>}</>;
}
