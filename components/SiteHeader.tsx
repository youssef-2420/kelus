"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLearner } from "@/components/LearnerProvider";

const links = [
  { href: "/today", label: "Today", matches: ["/today", "/session"], always: true },
  { href: "/materials", label: "Materials", matches: ["/materials"], always: false },
  { href: "/map", label: "Map", matches: ["/map", "/concept", "/concepts"], always: false },
  { href: "/route", label: "How it works", matches: ["/route"], always: true },
  { href: "/pricing", label: "Pricing", matches: ["/pricing", "/waitlist"], always: true },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const auth = useAuth();
  const { state } = useLearner();
  const destinationReady = state.onboardingCompleted;
  const displayName = auth.user?.user_metadata.full_name?.split(" ")[0] || auth.user?.email?.split("@")[0];
  const visibleLinks = links.filter((link) => link.always || destinationReady);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="mark site-wordmark" aria-label="Kelus home" aria-current={pathname === "/" ? "page" : undefined}>
          Kelus
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          {visibleLinks.map((link) => {
            const active = link.matches.some((prefix) => pathname.startsWith(prefix));
            return (
              <Link key={link.href} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {auth.loading ? <span className="site-auth-loading" aria-label="Checking account" /> : auth.user ? (
          <button type="button" className="site-auth-button is-signed-in" onClick={() => auth.signOut()} aria-label={`Sign out ${auth.user.email ?? "of Kelus"}`}>
            <span>{displayName}</span><small>Sign out</small>
          </button>
        ) : (
          <div className="site-header-cluster">
            <Link href="/today" className="site-header-action">
              Build today’s route <span aria-hidden="true">→</span>
            </Link>
            {auth.configured ? (
              <button type="button" className="site-auth-button" onClick={auth.openDialog} aria-haspopup="dialog" aria-expanded={auth.dialogOpen}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" /></svg>
                Sign in
              </button>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
