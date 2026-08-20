"use client";

import { usePathname } from "next/navigation";
import { SignInDialog } from "@/components/SignInDialog";

export function KelusHeader() {
  const pathname = usePathname();
  const navItems = [{ href: "/results", label: "Compare" }, { href: "/how-it-works", label: "How it works" }, { href: "/saved", label: "My alerts" }];
  return <header className="site-header">
    <a className="wordmark" href="/" aria-label="Kelus home" onClick={(event) => { if (pathname !== "/") { event.preventDefault(); window.location.href = "/"; } }}>kelus</a>
    <nav aria-label="Main navigation">
      {navItems.map((item) => <a key={item.href} href={item.href} className={pathname === item.href || (item.href === "/results" && pathname.startsWith("/product")) || (item.href === "/results" && pathname.startsWith("/compare")) ? "is-active" : ""}>{item.label}</a>)}
    </nav>
    <SignInDialog />
  </header>;
}
