"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useRef } from "react";

const links: Array<{
  href: string;
  label: string;
  matches: string[];
  always: true;
}> = [
  // Kept in source for deep-link + lock tests. Product chrome lives in the course space rail.
  { href: "/today", label: "Today", matches: ["/today", "/session"], always: true },
  { href: "/materials", label: "Materials", matches: ["/materials"], always: true },
  { href: "/map", label: "Map", matches: ["/map", "/concept", "/concepts"], always: true },
  { href: "/route", label: "How it works", matches: ["/route"], always: true },
  { href: "/pricing", label: "Pricing", matches: ["/pricing", "/waitlist"], always: true },
];

const PRODUCT_HREFS = new Set(["/today", "/materials", "/map"]);

export function SiteHeader() {
  const pathname = usePathname();
  const auth = useAuth();
  const inSession = pathname.startsWith("/session");
  const inProduct = ["/today", "/materials", "/map", "/concept"].some((path) => pathname.startsWith(path));
  const onHome = pathname === "/";
  const onHow = pathname.startsWith("/route");
  const onPricing = pathname.startsWith("/pricing") || pathname.startsWith("/waitlist");
  const showHeaderSample = !inProduct && !onHome && !onHow && !onPricing;
  const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (accountMenu.current && !accountMenu.current.contains(event.target as Node)) accountMenu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const displayName = auth.user?.user_metadata.full_name?.split(" ")[0] || auth.user?.email?.split("@")[0];
  // YouLearn model: header is brand + utilities only. Today/Materials/Map never appear here —
  // the course space rail owns those sections after diagnosis; first-run uses the chapter rail.
  const visibleLinks = inProduct || inSession ? [] : links.filter((link) => !PRODUCT_HREFS.has(link.href));

  return (
    <header
      className={`site-header${inSession ? " is-session" : ""}${inProduct ? " is-product is-space" : ""}${onHome ? " is-home" : ""}`}
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="site-header-inner">
        <Link href="/" className="mark site-footer-mark" aria-label="Kelus home" aria-current={pathname === "/" ? "page" : undefined}>
          Kelus
        </Link>

        {inSession ? (
          <p className="site-session-label">Open pages</p>
        ) : inProduct ? (
          <p className="site-space-label">Course space</p>
        ) : (
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
        )}

        {inSession ? (
          <Link href="/today" className="site-session-return" title="Return to Today — your place is kept">
            Close
          </Link>
        ) : auth.loading ? (
          <span className="site-auth-loading" aria-label="Checking account" />
        ) : auth.user ? (
          <details
            className="site-account-menu"
            ref={accountMenu}
            key={pathname}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Your account">
              <span className="account-initial" aria-hidden="true">
                {displayName?.slice(0, 1).toUpperCase()}
              </span>
              {displayName}
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="site-account-panel">
              <p>
                Signed in as<strong>{auth.user.email}</strong>
              </p>
              <button type="button" onClick={() => auth.signOut()}>
                Sign out
              </button>
            </div>
          </details>
        ) : (
          <div className="site-header-cluster">
            {showHeaderSample && (
              <Link href="/today?sample=1" className="site-header-action">
                Try sample <span aria-hidden="true">→</span>
              </Link>
            )}
            {auth.configured ? (
              <button type="button" className="site-auth-button" onClick={auth.openDialog} aria-haspopup="dialog" aria-expanded={auth.dialogOpen}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
                </svg>
                Sign in
              </button>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
