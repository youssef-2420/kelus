"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { MaterialShelfIllustration } from "@/components/home/MaterialShelfIllustration";
import { RerouteIllustration } from "@/components/home/RerouteIllustration";
import { TodayPlanIllustration } from "@/components/home/TodayPlanIllustration";
import { Reveal } from "@/components/motion";

export function HomeAfterHero() {
  return (
    <>
      <section id="how" className="v1-story-section is-plan" aria-labelledby="v1-plan-title">
        <Reveal className="v1-story-copy">
          <p className="kicker">01 · Today’s plan</p>
          <h2 id="v1-plan-title">Your next 45 minutes.</h2>
          <p>
            Kelus turns the time you have into a short route. The first topic is there for a reason—not because it was
            first in the syllabus.
          </p>
          <Link href="/today">
            Build today’s plan <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
        <Reveal delay={0.08} className="v1-story-visual">
          <TodayPlanIllustration />
        </Reveal>
      </section>

      <section id="route" className="v1-story-section is-reroute" aria-labelledby="v1-reroute-title">
        <Reveal className="v1-story-copy">
          <p className="kicker">02 · New evidence</p>
          <h2 id="v1-reroute-title">One answer changes the route.</h2>
          <p>
            “Almost” is useful information. Kelus keeps that topic close and quietly reorganizes what should come
            next—without rebuilding the whole plan.
          </p>
          <Link href="/route">
            See how rerouting works <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
        <Reveal delay={0.08} className="v1-story-visual">
          <RerouteIllustration />
        </Reveal>
      </section>

      <section className="v1-story-section is-materials" aria-labelledby="v1-materials-title">
        <Reveal className="v1-story-copy">
          <p className="kicker">03 · Course material</p>
          <h2 id="v1-materials-title">Everything for the exam, together.</h2>
          <p>
            Add a syllabus or lecture PDF, review the proposed concepts, and keep each learning activity connected
            to the page it came from.
          </p>
          <Link href="/today">
            Start with my course <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
        <Reveal delay={0.08} className="v1-story-visual">
          <MaterialShelfIllustration />
        </Reveal>
      </section>

      <section className="v1-method" aria-labelledby="v1-method-title">
        <Reveal className="v1-method-heading">
          <p className="kicker">Honest methodology</p>
          <h2 id="v1-method-title">A recommendation you can inspect.</h2>
          <p>Kelus makes a focused decision from information the student actually supplied.</p>
        </Reveal>
        <Reveal delay={0.08}>
          <dl>
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

      <Reveal>
        <footer className="home-foot v1-foot">
          <div className="v1-foot-copy">
            <p className="kicker">Start with what matters</p>
            <h2>Walk into the exam knowing what you worked on—and why.</h2>
          </div>
          <div className="v1-foot-actions">
            <span className="mark">Kelus</span>
            <div className="v1-foot-links">
              <Link href="/today">
                Make today’s plan <span aria-hidden="true">→</span>
              </Link>
              <Link href="/waitlist" className="text-btn">Join the waitlist</Link>
            </div>
          </div>
        </footer>
      </Reveal>
      <SiteFooter />
    </>
  );
}
