"use client";

import { useEffect, useRef, useState } from "react";
import { SafeLink as Link } from "@/components/SafeLink";
import { Icon } from "@/components/Icon";

type NavItem = { href: string; label: string };

export function MobileNavigation({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const toggle = toggleRef.current;
    const firstLink = panel?.querySelector<HTMLElement>("a[href]");
    firstLink?.focus();
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function handleTab(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) { event.preventDefault(); last.focus(); }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleEscape);
    panel?.addEventListener("keydown", handleTab);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      panel?.removeEventListener("keydown", handleTab);
      toggle?.focus();
    };
  }, [open]);

  return <div className="mobile-nav">
    <button ref={toggleRef} type="button" className="mobile-nav-toggle" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
      Menu <Icon name={open ? "close" : "sliders"} size={16}/>
    </button>
    <nav ref={panelRef} id="mobile-navigation" className={`mobile-nav-panel${open ? " is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!open}>
      {items.map((item) => <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>{item.label}</Link>)}
    </nav>
  </div>;
}
