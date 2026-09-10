"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useRef } from "react";

const links = [
  { href: "/today", label: "Today", matches: ["/today", "/session"], always: true },
  { href: "/materials", label: "Materials", matches: ["/materials"], always: true },
  { href: "/map", label: "Map", matches: ["/map", "/concept", "/concepts"], always: true },
  { href: "/route", label: "How it works", matches: ["/route"], always: true },
  { href: "/pricing", label: "Pricing", matches: ["/pricing", "/waitlist"], always: true },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const auth = useAuth();
  const inSession = pathname.startsWith("/session");
  const inProduct = ["/today", "/materials", "/map", "/concept"].some((path) => pathname.startsWith(path));
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (accountMenu.current && !accountMenu.current.contains(event.target as Node)) accountMenu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    const header = headerRef.current;
    const hero = document.querySelector(".kelus-hero.is-poster");
    if (!header || !(hero instanceof HTMLElement)) {
      header?.classList.remove("is-on-poster");
      return;
    }

    const sync = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      const headerHeight = header.offsetHeight;
      header.classList.toggle("is-on-poster", heroBottom > headerHeight + 8);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      header.classList.remove("is-on-poster");
    };
  }, [pathname]);
  const displayName = auth.user?.user_metadata.full_name?.split(" ")[0] || auth.user?.email?.split("@")[0];
  const visibleLinks = links;
  const onPosterHome = pathname === "/";

  return (
    <header
      ref={headerRef}
      className={`site-header${inSession ? " is-session" : ""}${inProduct ? " is-product" : ""}${onPosterHome ? " is-on-poster" : ""}`}
    >
      <div className="site-header-inner">
        <Link href="/" className="mark site-wordmark" aria-label="Kelus home" aria-current={pathname === "/" ? "page" : undefined}>
          Kelus
        </Link>

        {inSession ? <p className="site-session-label">Revision session</p> : <nav className="site-nav" aria-label="Primary navigation">
          {visibleLinks.map((link) => {
            const active = link.matches.some((prefix) => pathname.startsWith(prefix));
            return (
              <Link key={link.href} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>}

        {inSession ? (
          <Link href="/today" className="site-session-return">Pause and return to Today</Link>
        ) : auth.loading ? <span className="site-auth-loading" aria-label="Checking account" /> : auth.user ? (
          <details className="site-account-menu" ref={accountMenu} key={pathname} onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}>
            <summary aria-label="Your account"><span className="account-initial" aria-hidden="true">{displayName?.slice(0, 1).toUpperCase()}</span>{displayName}<span aria-hidden="true">⌄</span></summary>
            <div className="site-account-panel">
              <p>Signed in as<strong>{auth.user.email}</strong></p>
              <button type="button" onClick={() => auth.signOut()}>Sign out</button>
            </div>
          </details>
        ) : (
          <div className="site-header-cluster">
            {!inProduct && <Link href="/today" className="site-header-action">
              Start revising <span aria-hidden="true">→</span>
            </Link>}
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
