"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today", matches: ["/today", "/session"] },
  { href: "/materials", label: "Materials", matches: ["/materials"] },
  { href: "/map", label: "Map", matches: ["/map", "/concept", "/concepts"] },
  { href: "/route", label: "How it works", matches: ["/route"] },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="mark site-wordmark" aria-label="Kelus home" aria-current={pathname === "/" ? "page" : undefined}>
          Kelus
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          {links.map((link) => {
            const active = link.matches.some((prefix) => pathname.startsWith(prefix));
            return (
              <Link key={link.href} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {pathname.startsWith("/today") ? null : (
          <Link href="/today" className="site-header-action">
            Study now <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </header>
  );
}
