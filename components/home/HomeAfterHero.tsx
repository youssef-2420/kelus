"use client";

import Link from "next/link";
import { BookletRevisionBoard } from "@/components/hero/BookletRevisionBoard";
import { RevisionReturn, StudyMoment } from "@/components/home/HomeVisualChapters";
import { RevisionLoopVisuals } from "@/components/home/RevisionLoopVisuals";
import { Reveal } from "@/components/motion";

/** Let visitors try the revision loop before explaining it. */
export function HomeAfterHero() {
  return (
    <>
      <section id="try" className="poster-sample" aria-labelledby="poster-sample-title">
        <Reveal className="poster-sample-intro">
          <p className="kicker">Interactive sample</p>
          <h2 id="poster-sample-title">Your answer changes what comes next.</h2>
          <p>
            Reveal the answer, then mark how it went. Watch the next topic move into place.
            This page preview is not saved.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <BookletRevisionBoard />
        </Reveal>
        <Reveal className="poster-sample-next">
          <p>Ready to do a full study pass?</p>
          <Link href="/today">Set up my course <span aria-hidden="true">→</span></Link>
        </Reveal>
      </section>

      <RevisionLoopVisuals />
      <StudyMoment />

      <RevisionReturn />

    </>
  );
}
