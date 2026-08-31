"use client";

import { useAuth } from "@/components/AuthProvider";

export function AppSignInToast() {
  const { signInNotice, clearSignInNotice } = useAuth();
  if (!signInNotice) return null;
  return <div className="app-signin-toast" role="status">
    <p>{signInNotice}</p>
    <button type="button" className="verified-notice-dismiss" onClick={clearSignInNotice} aria-label="Dismiss sign-in message">×</button>
  </div>;
}
