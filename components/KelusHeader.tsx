import { SignInDialog } from "@/components/SignInDialog";

export function KelusHeader() {
  const navItems = [{ href: "/results", label: "Compare" }, { href: "/how-it-works", label: "How it works" }, { href: "/saved", label: "My alerts" }];
  return <header className="site-header">
    <a className="wordmark" href="/" aria-label="Kelus home">kelus</a>
    <nav aria-label="Main navigation">
      {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
    </nav>
    <SignInDialog />
  </header>;
}
