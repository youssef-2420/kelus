"use client";

import { BookletRevisionBoard } from "@/components/hero/BookletRevisionBoard";
import { RevisionReturn, StudyMoment } from "@/components/home/HomeVisualChapters";
import { RevisionLoopVisuals } from "@/components/home/RevisionLoopVisuals";
import { Reveal } from "@/components/motion";

/** A visual route from studying, to a live sample, to the next attempt. */
export function HomeAfterHero() {
  return (
    <>
      <RevisionLoopVisuals />
      <StudyMoment />
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

      <RevisionReturn />

      <section className="home-close folio-close" aria-labelledby="home-close-title">
        <Reveal className="home-close-inner is-cluster">
          <div className="home-close-copy">
            <h2 id="home-close-title">Walk into the exam knowing what you worked on — and why.</h2>
            <p>
              Set your exam and build a study plan from your own notes.
            </p>
          </div>
        </Reveal>
      </section>

    </>
  );
}
