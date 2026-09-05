"use client";

import Link from "next/link";
import { useState } from "react";

export function HomeHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="home-bar">
      <Link href="/" className="mark">
        Kelus
      </Link>
      <nav className="home-nav" aria-label="Marketing">
        <Link href="/today" className="home-signin">
          Sign in
        </Link>
        <Link href="/today" className="cta home-cta compact">
          Start learning
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </nav>
      <button
        type="button"
        className="home-menu-btn"
        aria-expanded={open}
        aria-controls="home-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <div id="home-menu" className={`home-menu${open ? " is-open" : ""}`} hidden={!open}>
        <Link href="/today" className="home-signin" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link href="/today" className="cta home-cta compact" onClick={() => setOpen(false)}>
          Start learning
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </header>
  );
}
