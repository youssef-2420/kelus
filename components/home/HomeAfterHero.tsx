"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { MaterialShelfIllustration } from "@/components/home/MaterialShelfIllustration";
import { RerouteIllustration } from "@/components/home/RerouteIllustration";
import { TodayPlanIllustration } from "@/components/home/TodayPlanIllustration";
import { Pressable, Reveal } from "@/components/motion";

export function HomeAfterHero() {
  return (
    <div className="home-product-story">
      <div className="home-story-thread" aria-hidden="true">
        <span className="home-story-thread-line" />
        <span className="home-story-thread-node is-plan" />
        <span className="home-story-thread-node is-reroute" />
        <span className="home-story-thread-node is-materials" />
      </div>

      <section id="how" className="v1-story-section is-plan is-band is-chapter" data-chapter="01" aria-labelledby="v1-plan-title">
        <Reveal className="v1-story-copy">
          <p className="kicker">01 · Today’s plan</p>
          <h2 id="v1-plan-title">Your next 45 minutes.</h2>
          <p>
            Spend a short session revising your lessons: review an idea, recall it from memory, then apply it.
            Your recent answers help Kelus choose what to practise first.
          </p>
          <Pressable>
            <Link href="/today" className="v1-story-link">
              Start revising <span aria-hidden="true">→</span>
            </Link>
          </Pressable>
        </Reveal>
        <Reveal delay={0.08} className="v1-story-visual">
          <div className="v1-story-scene">
            <TodayPlanIllustration />
          </div>
        </Reveal>
      </section>

      <section id="route" className="v1-story-section is-reroute is-band is-chapter" data-chapter="02" aria-labelledby="v1-reroute-title">
        <Reveal className="v1-story-copy">
          <p className="kicker">02 · New evidence</p>
          <h2 id="v1-reroute-title">One answer changes the route.</h2>
          <p>
            A weak answer shows what needs another attempt. Kelus adjusts the revision order so you can
            practise that topic again and keep reviewing what you have already studied.
          </p>
          <Pressable>
            <Link href="/route" className="v1-story-link">
              See how rerouting works <span aria-hidden="true">→</span>
            </Link>
          </Pressable>
        </Reveal>
        <Reveal delay={0.08} className="v1-story-visual">
          <div className="v1-story-scene">
            <RerouteIllustration />
          </div>
        </Reveal>
      </section>

      <section className="v1-story-section is-materials is-band is-chapter" data-chapter="03" aria-labelledby="v1-materials-title">
        <Reveal className="v1-story-copy">
          <p className="kicker">03 · Course material</p>
          <h2 id="v1-materials-title">Revise from your own course material.</h2>
          <p>
            Add a syllabus or lecture PDF, review the proposed concepts, and keep each learning activity connected to
            the page it came from.
          </p>
          <Pressable>
            <Link href="/today" className="v1-story-link">
              Start revising <span aria-hidden="true">→</span>
            </Link>
          </Pressable>
        </Reveal>
        <Reveal delay={0.08} className="v1-story-visual">
          <div className="v1-story-scene">
            <MaterialShelfIllustration />
          </div>
        </Reveal>
      </section>

      <section className="v1-method is-band" aria-labelledby="v1-method-title">
        <Reveal className="v1-method-heading">
          <p className="kicker">Honest methodology</p>
          <h2 id="v1-method-title">A recommendation you can inspect.</h2>
          <p>Your material, recall checks, and exam date guide what Kelus suggests you revise next.</p>
        </Reveal>
        <Reveal delay={0.08}>
          <dl className="v1-method-ledger">
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

      <section className="home-close is-band" aria-labelledby="home-close-title">
        <Reveal className="home-close-inner">
          <div className="home-close-copy">
            <h2 id="home-close-title">Walk into the exam knowing what you worked on—and why.</h2>
            <p>Try a revision session free on this device. See Exam Pass if you want priority support through exam day.</p>
          </div>
          <div className="home-close-actions">
            <Pressable>
              <Link href="/today" className="cta">
                Start revising <span aria-hidden="true">→</span>
              </Link>
            </Pressable>
            <Link href="/pricing" className="home-close-secondary">
              See pricing
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
