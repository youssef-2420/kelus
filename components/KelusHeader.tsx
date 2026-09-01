import { SignInDialog } from "@/components/SignInDialog";
import { MobileNavigation } from "@/components/MobileNavigation";
import { SafeLink as Link } from "@/components/SafeLink";

export function KelusHeader() {
  const navItems = [{ href: "/#product-search", label: "Search" }, { href: "/how-it-works", label: "How it works" }, { href: "/methodology", label: "Methodology" }, { href: "/alerts", label: "My alerts" }];
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="Kelus home">kelus</Link>
    <nav aria-label="Main navigation">
      {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
    </nav>
    <div className="header-actions"><MobileNavigation items={navItems}/><SignInDialog /></div>
  </header>;
}
