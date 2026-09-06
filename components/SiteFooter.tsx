import Link from "next/link";

const links = [
  { href: "/route", label: "How it works" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "site-footer is-compact" : "site-footer"}>
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="mark">
            Kelus
          </Link>
          <p>Local-first exam prep. Your files stay on this device unless you choose to sign in.</p>
        </div>
        <nav className="site-footer-nav" aria-label="Footer">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="site-footer-note">© {new Date().getFullYear()} Kelus · kelus.me</p>
    </footer>
  );
}
