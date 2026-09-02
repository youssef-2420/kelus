"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";

export function AppSignInToast() {
  const { signInNotice, clearSignInNotice } = useAuth();

  useEffect(() => {
    if (!signInNotice) return undefined;
    const timer = window.setTimeout(clearSignInNotice, 5200);
    return () => window.clearTimeout(timer);
  }, [clearSignInNotice, signInNotice]);

  if (!signInNotice) return null;
  return <div className="app-signin-toast is-visible" role="status">
    <Icon name="shield" size={18}/>
    <p>{signInNotice}</p>
    <button type="button" className="verified-notice-dismiss" onClick={clearSignInNotice} aria-label="Dismiss sign-in message">×</button>
  </div>;
}
