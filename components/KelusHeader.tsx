import { SignInDialog } from "@/components/SignInDialog";
import Link from "next/link";

export function KelusHeader() {
  const navItems = [{ href: "/results", label: "Compare" }, { href: "/how-it-works", label: "How it works" }, { href: "/saved", label: "My alerts" }];
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="Kelus home">kelus</Link>
    <nav aria-label="Main navigation">
      {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
    </nav>
    <SignInDialog />
  </header>;
}
