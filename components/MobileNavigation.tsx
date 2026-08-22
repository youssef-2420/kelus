"use client";

import { useState } from "react";
import { SafeLink as Link } from "@/components/SafeLink";
import { Icon } from "@/components/Icon";

type NavItem = { href: string; label: string };

export function MobileNavigation({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return <div className="mobile-nav">
    <button type="button" className="mobile-nav-toggle" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
      Menu <Icon name={open ? "close" : "sliders"} size={16}/>
    </button>
    <nav id="mobile-navigation" className={`mobile-nav-panel${open ? " is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!open}>
      {items.map((item) => <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>{item.label}</Link>)}
    </nav>
  </div>;
}
