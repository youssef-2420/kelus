import { SignInDialog } from "@/components/SignInDialog";
import { MobileNavigation } from "@/components/MobileNavigation";
import { SafeLink as Link } from "@/components/SafeLink";

const navItems = [
  { href: "/search", label: "Search" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/methodology", label: "Methodology" },
  { href: "/alerts", label: "My alerts" },
];

type Props = {
  shell?: "default" | "search";
  activeHref?: string;
};

export function KelusHeader({ shell = "default", activeHref }: Props) {
  const items = shell === "search" ? navItems.filter((item) => item.href !== "/search") : navItems;
  return (
    <header className={`site-header${shell === "search" ? " is-search-shell" : ""}`}>
      <Link className="wordmark" href="/" aria-label="Kelus home">kelus</Link>
      <nav aria-label="Main navigation">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={activeHref === item.href || (shell === "search" && item.href === "/search") ? "is-active" : undefined}
            aria-current={activeHref === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions"><MobileNavigation items={items} /><SignInDialog /></div>
    </header>
  );
}
