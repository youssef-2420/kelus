"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { SignInDialog } from "@/components/SignInDialog";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!client) return;
    let active = true;

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) setDialogOpen(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const requireClient = useCallback(() => {
    if (!client) throw new Error("Sign in is temporarily unavailable. Kelus authentication is not configured.");
    return client;
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: Boolean(client),
    dialogOpen,
    openDialog: () => setDialogOpen(true),
    closeDialog: () => setDialogOpen(false),
    signIn: async (email, password) => {
      const { error } = await requireClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (name, email, password) => {
      const { data, error } = await requireClient().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/today/`,
        },
      });
      if (error) throw error;
      return !data.session;
    },
    signInWithGoogle: async () => {
      const { error } = await requireClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/today/` },
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await requireClient().auth.signOut();
      if (error) throw error;
    },
  }), [client, dialogOpen, loading, requireClient, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInDialog />
    </AuthContext.Provider>
  );
}
