"use client";

import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { KnowledgeLandscape } from "./KnowledgeLandscape";
import { RerouteSequence } from "./RerouteSequence";
import { StudentIllustration } from "./StudentIllustration";
import { NODE_MAP } from "./landscape-data";
import { phaseAtLeast, useHeroTimeline } from "./useHeroTimeline";

const copyEase = [0.22, 1, 0.36, 1] as const;
const copyItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: copyEase } },
};

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia("(max-width: 860px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useMobileLayout() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 860px)").matches,
    () => false,
  );
}

export function KelusHero() {
  const reduceMotion = useReducedMotion() === true;
  const mobile = useMobileLayout();
  const layout = mobile ? "mobile" : "desktop";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const phase = useHeroTimeline(reduceMotion, Boolean(hoveredId));
  const elasticityMastery = phaseAtLeast(phase, "learn") ? 46 : 42;
  const hovered = hoveredId ? NODE_MAP[hoveredId] : null;

  const root = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: root,
    offset: ["start start", "end start"],
  });
  const studentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, reduceMotion ? 1 : 0.4]);
  const landscapeY = useTransform(scrollYProgress, [0, 0.8], [0, reduceMotion ? 0 : -32]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 22, bounce: 0 });
  const sy = useSpring(py, { stiffness: 90, damping: 22, bounce: 0 });
  const studentX = useTransform(sx, (value) => value * 0.5);
  const studentY = useTransform(sy, (value) => value * 0.5);
  const landX = useTransform(sx, (value) => value * 8);
  const landY = useTransform(sy, (value) => value * 8);
  const studentShift = useMotionTemplate`translate(${studentX}px, ${studentY}px)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
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
    <section ref={root} className="kelus-hero home-hero">
      <motion.div
        className="kelus-hero-copy home-copy"
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
        }}
      >
        <motion.p className="kicker" variants={copyItem}>
          Learning navigation
        </motion.p>
        <motion.h1 variants={copyItem}>
          Know what
          <br />
          to learn next.
        </motion.h1>
        <motion.p className="home-lede" variants={copyItem}>
          Kelus maps the best path from what you know today to where you want to be — and reroutes as you learn.
        </motion.p>
        <motion.div className="home-actions" variants={copyItem}>
          <Link href="/today" className="cta home-cta">
            Build my route
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <a href="#how" className="home-secondary">
            See how it works
          </a>
        </motion.div>
      </motion.div>

      <motion.div className="kelus-hero-art" style={{ y: landscapeY }} onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="hero-grain" aria-hidden="true" />
        <motion.div className="hero-student-wrap" style={{ opacity: studentOpacity, transform: studentShift }}>
          <StudentIllustration className="hero-student" />
        </motion.div>
        <motion.div className="hero-landscape-wrap" style={{ x: landX, y: landY }}>
          <KnowledgeLandscape
            layout={layout}
            phase={phase}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            elasticityMastery={elasticityMastery}
            reduceMotion={reduceMotion}
          />
        </motion.div>
        <RerouteSequence phase={phase} />
        {hovered?.why ? (
          <aside className="hero-why" aria-live="polite">
            <p className="hero-why-name">{hovered.name}</p>
            <p className="hero-why-num">
              {hovered.id === "elasticity" ? elasticityMastery : hovered.mastery}% mastery
            </p>
            <p className="kicker">Why now</p>
            <p>{hovered.why.importance}</p>
            <p>{hovered.why.mastery}</p>
            <p>{hovered.why.value}</p>
          </aside>
        ) : null}
      </motion.div>
    </section>
  );
}
