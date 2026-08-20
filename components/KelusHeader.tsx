"use client";

import { Icon } from "@/components/Icon";
import { usePathname } from "next/navigation";

export function KelusHeader() {
  const pathname = usePathname();
  const navItems = [{ href: "/results", label: "Compare" }, { href: "/how-it-works", label: "How it works" }, { href: "/saved", label: "My alerts" }];
  return <header className="site-header">
    <a className="wordmark" href="/" aria-label="Kelus home">kelus</a>
    <nav aria-label="Main navigation">
      {navItems.map((item) => <a key={item.href} href={item.href} className={pathname === item.href || (item.href === "/results" && pathname.startsWith("/product")) || (item.href === "/results" && pathname.startsWith("/compare")) ? "is-active" : ""}>{item.label}</a>)}
    </nav>
    <a className="header-signin" href="/saved"><Icon name="bell" size={17} /> Alerts</a>
  </header>;
}
