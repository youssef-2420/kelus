"use client";

import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, type PointerEvent } from "react";
import { StudentIllustration } from "./StudentIllustration";

export function KelusHero() {
  const reduceMotion = useReducedMotion() === true;
  const root = useRef<HTMLElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 22, bounce: 0 });
  const sy = useSpring(py, { stiffness: 90, damping: 22, bounce: 0 });
  const studentX = useTransform(sx, (value) => value * 10);
  const studentY = useTransform(sy, (value) => value * 8);
  const studentShift = useMotionTemplate`translate(${studentX}px, ${studentY}px)`;

  const onMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width - 0.5);
    py.set((event.clientY - box.top) / box.height - 0.5);
  };

  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <section
      ref={root}
      className="kelus-hero home-hero is-student"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="kelus-hero-copy home-copy">
        <p className="kicker">For the student at the desk</p>
        <h1>
          Know what to
          <br />
          learn next.
        </h1>
        <p className="home-lede">
          Sit down with your exam. Kelus decides the route from here — so you don’t spend the evening choosing.
        </p>
        <div className="home-actions">
          <Link href="/today" className="cta home-cta">
            Start today’s plan
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <a href="#route" className="home-secondary">
            See the route
          </a>
        </div>
      </div>

      <div className="kelus-hero-art">
        <div className="hero-grain" aria-hidden="true" />
        <motion.div className="hero-student-wrap" style={{ transform: studentShift }}>
          <StudentIllustration className="hero-student" />
        </motion.div>
      </div>
    </section>
  );
}
