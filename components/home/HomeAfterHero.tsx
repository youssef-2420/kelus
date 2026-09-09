"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroProductDemo } from "@/components/hero/HeroProductDemo";
import { MaterialShelfIllustration } from "@/components/home/MaterialShelfIllustration";
import { RerouteIllustration } from "@/components/home/RerouteIllustration";
import { TodayPlanIllustration } from "@/components/home/TodayPlanIllustration";
import { Reveal } from "@/components/motion";

export function HomeAfterHero() {
  return (
    <>
      <section id="try" className="folio-product-stage" aria-labelledby="folio-product-title">
        <Reveal className="folio-product-intro">
          <p className="kicker">The product</p>
          <h2 id="folio-product-title">Try a revision question. Watch the route move.</h2>
          <p>
            This example is not saved. Reveal an answer, pick an outcome, and see how today’s route
            would reorder before you bring your own course.
          </p>
        </Reveal>
        <Reveal delay={0.08} className="folio-product-frame">
          <HeroProductDemo />
        </Reveal>
      </section>

      <div className="folio-story" id="how">
        <section className="folio-chapter is-plan" aria-labelledby="folio-plan-title">
          <Reveal className="folio-chapter-copy">
            <p className="folio-chapter-index" aria-hidden="true">01</p>
            <p className="kicker">Today’s plan</p>
            <h2 id="folio-plan-title">Your next 45 minutes.</h2>
            <p>
              Spend a short session revising your lessons: review an idea, recall it from memory, then apply it.
              Your recent answers help Kelus choose what to practise first.
            </p>
            <Link href="/today">
              Start revising <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="folio-chapter-art">
            <TodayPlanIllustration />
          </Reveal>
        </section>

        <section id="route" className="folio-chapter is-reroute" aria-labelledby="folio-reroute-title">
          <Reveal className="folio-chapter-copy">
            <p className="folio-chapter-index" aria-hidden="true">02</p>
            <p className="kicker">New evidence</p>
            <h2 id="folio-reroute-title">One answer changes the route.</h2>
            <p>
              A weak answer shows what needs another attempt. Kelus adjusts the revision order so you can
              practise that topic again and keep reviewing what you have already studied.
            </p>
            <Link href="/route">
              See how rerouting works <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="folio-chapter-art">
            <RerouteIllustration />
          </Reveal>
        </section>

        <section className="folio-chapter is-materials" aria-labelledby="folio-materials-title">
          <Reveal className="folio-chapter-copy">
            <p className="folio-chapter-index" aria-hidden="true">03</p>
            <p className="kicker">Course material</p>
            <h2 id="folio-materials-title">Revise from your own course material.</h2>
            <p>
              Add a syllabus or lecture PDF, review the proposed concepts, and keep each learning activity connected to
              the page it came from.
            </p>
            <Link href="/today">
              Start revising <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="folio-chapter-art">
            <MaterialShelfIllustration />
          </Reveal>
        </section>
      </div>

      <section className="folio-method" aria-labelledby="folio-method-title">
        <Reveal className="folio-method-heading">
          <p className="kicker">Honest methodology</p>
          <h2 id="folio-method-title">A recommendation you can inspect.</h2>
          <p>Your material, recall checks, and exam date guide what Kelus suggests you revise next.</p>
        </Reveal>
        <Reveal delay={0.08}>
          <dl className="folio-method-grid">
            <div>
              <dt>Exam</dt>
              <dd>Date and target score</dd>
            </div>
            <div>
              <dt>Knowledge</dt>
              <dd>Reported confidence and retrieval results</dd>
            </div>
            <div>
              <dt>Constraints</dt>
              <dd>Available study time and prerequisites</dd>
            </div>
            <div>
              <dt>Boundary</dt>
              <dd>Guidance—not a grade prediction</dd>
            </div>
          </dl>
        </Reveal>
      </section>

      <section className="home-close folio-close" aria-labelledby="home-close-title">
        <Reveal className="home-close-inner">
          <div className="home-close-copy">
            <h2 id="home-close-title">Walk into the exam knowing what you worked on—and why.</h2>
            <p>Try a revision session free on this device. See Exam Pass if you want priority support through exam day.</p>
          </div>
          <div className="home-close-actions">
            <Link href="/today" className="cta">
              Start revising <span aria-hidden="true">→</span>
            </Link>
            <Link href="/pricing" className="text-btn">
              See pricing
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </>
  );
}
