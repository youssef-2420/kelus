"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const plan = [
  { order: "01", topic: "Elasticity", reason: "Highest-value gap", minutes: 20, width: "100%" },
  { order: "02", topic: "Externalities", reason: "Needs retrieval", minutes: 15, width: "75%" },
  { order: "03", topic: "Market structures", reason: "Build a baseline", minutes: 10, width: "50%" },
] as const;

export function TodayPlanIllustration() {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() === true;
  const visible = useInView(root, { once: true, amount: 0.35 });
  const play = reduce || visible;

  return (
    <div ref={root} className="v1-plan" aria-label="Example 45 minute Microeconomics plan">
      <header>
        <div>
          <span>Example plan</span>
          <strong>Microeconomics</strong>
        </div>
        <p>
          <b>45</b>
          <span>minutes</span>
        </p>
      </header>

      <ol>
        {plan.map((item, index) => (
          <motion.li
            key={item.topic}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.4, delay: reduce ? 0 : index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>{item.order}</span>
            <div>
              <strong>{item.topic}</strong>
              <small>{item.reason}</small>
              <i aria-hidden="true">
                <motion.em
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={play ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ duration: 0.55, delay: reduce ? 0 : 0.18 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: item.width }}
                />
              </i>
            </div>
            <b>{item.minutes}m</b>
          </motion.li>
        ))}
      </ol>

      <footer>
        <span aria-hidden="true">↳</span>
        Start with Elasticity because it combines low confidence with high exam value.
      </footer>
    </div>
  );
}
