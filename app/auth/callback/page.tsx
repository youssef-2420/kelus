"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function Callback() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Completing your secure sign-in…");
  useEffect(() => {
    const code = params.get("code");
    const requested = params.get("next") ?? "/";
    const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
    const client = getSupabaseBrowserClient();
    if (!client || !code) { queueMicrotask(() => setMessage("This authentication link is invalid or has expired.")); return; }
    client.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setMessage(error.message);
      else window.location.replace(next);
    });
  }, [params]);
  return <main className="auth-callback"><span className="auth-spinner is-dark"/><p>{message}</p></main>;
}

export default function AuthCallbackPage() {
  return <Suspense fallback={<main className="auth-callback"><p>Completing your secure sign-in…</p></main>}><Callback/></Suspense>;
}
