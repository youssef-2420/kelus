"use client";

import Link from "next/link";
import { BookletRevisionBoard } from "@/components/hero/BookletRevisionBoard";
import { Reveal } from "@/components/motion";

/**
 * Below the fold: one live proof of the loop, then close.
 * Feature chapters and method grids belong in How it works — not the homepage.
 */
export function HomeAfterHero() {
  return (
    <>
      <section id="try" className="poster-sample" aria-labelledby="poster-sample-title">
        <Reveal className="poster-sample-intro">
          <p className="kicker">Interactive sample</p>
          <h2 id="poster-sample-title">Answer, then watch the route move.</h2>
          <p>
            Reveal a check. Mark how it went. The order updates — on paper, in about a minute.
            This sample is not saved.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <BookletRevisionBoard />
        </Reveal>
      </section>

      <section className="home-close folio-close" aria-labelledby="home-close-title">
        <Reveal className="home-close-inner is-cluster">
          <div className="home-close-copy">
            <h2 id="home-close-title">Walk into the exam knowing what you worked on — and why.</h2>
            <p>
              Try the sample on this device, or set your exam and build a study plan from your own notes.
            </p>
          </div>
          <div className="home-close-actions">
            <Link href="/today?sample=1" className="cta">
              Try sample (~1 min) <span aria-hidden="true">→</span>
            </Link>
            <Link href="/today" className="text-btn">
              Set my exam
            </Link>
          </div>
        </Reveal>
      </section>

    </>
  );
}
