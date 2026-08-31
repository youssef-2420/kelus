"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PRICE_ALERTS_CHANGED } from "@/services/price-alerts";
import { migrateLocalAlerts } from "@/services/user-alerts";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  recovery: boolean;
  clearRecovery: () => void;
  signInNotice: string | null;
  clearSignInNotice: () => void;
};

const AuthContext = createContext<AuthContextValue>({ configured: false, loading: true, user: null, recovery: false, clearRecovery: () => undefined, signInNotice: null, clearSignInNotice: () => undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [signInNotice, setSignInNotice] = useState<string | null>(null);
  const authReady = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kelus-sign-in-notice") === "1") {
      sessionStorage.removeItem("kelus-sign-in-notice");
      queueMicrotask(() => setSignInNotice("Signed in. Your alerts will sync across devices."));
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) { queueMicrotask(() => setLoading(false)); return; }
    let active = true;
    const authTimeout = window.setTimeout(() => { if (active) setLoading(false); }, 1_500);

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      window.clearTimeout(authTimeout);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (active) { window.clearTimeout(authTimeout); setLoading(false); }
    });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      window.clearTimeout(authTimeout);
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!authReady.current) {
        authReady.current = true;
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        setSignInNotice("Signed in. Your alerts will sync across devices.");
      }
    });

    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setUser(null);
        return;
      }
      setUser(data.user);
    });

    return () => { active = false; window.clearTimeout(authTimeout); data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    migrateLocalAlerts(user).then(() => window.dispatchEvent(new CustomEvent(PRICE_ALERTS_CHANGED))).catch(() => {
      // Keep local records untouched; the Alerts page will show a retryable sync error.
    });
  }, [user]);

  const value = useMemo(() => ({
    configured,
    loading,
    user,
    recovery,
    clearRecovery: () => setRecovery(false),
    signInNotice,
    clearSignInNotice: () => setSignInNotice(null),
  }), [configured, loading, recovery, signInNotice, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
