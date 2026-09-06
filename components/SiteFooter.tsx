import Link from "next/link";

const links = [
  { href: "/route", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "site-footer is-compact" : "site-footer"}>
      <div className="site-footer-inner">
        <Link href="/" className="mark site-footer-mark">
          Kelus
        </Link>
        <nav className="site-footer-nav" aria-label="Footer">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="site-footer-note">Local-first exam prep · © {new Date().getFullYear()} Kelus</p>
    </footer>
  );
}
