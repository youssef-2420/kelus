"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const slices = [
  { name: "Elasticity", minutes: 18 },
  { name: "Monetary Policy", minutes: 12 },
  { name: "Market Structures", minutes: 10 },
  { name: "Retrieval", minutes: 5 },
];

export function TimeClaim() {
  const reduce = useReducedMotion() === true;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const play = reduce || inView;

  return (
    <div ref={ref} className="time-claim" aria-label="Forty-five minutes allocated across the route">
      <p className="time-claim-hero">
        <b>45</b>
        <span>min</span>
      </p>
      <ol>
        {slices.map((slice, index) => (
          <li key={slice.name}>
            <span>{slice.name}</span>
            <i>
              <motion.em
                initial={reduce ? false : { scaleX: 0 }}
                animate={play ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.7, delay: reduce ? 0 : 0.16 + index * 0.1, ease }}
                style={{ width: `${(slice.minutes / 45) * 100}%` }}
              />
            </i>
            <b>{slice.minutes}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
