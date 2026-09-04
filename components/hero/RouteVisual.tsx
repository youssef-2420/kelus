"use client";

import { motion } from "motion/react";
import type { RouteStop } from "./route-data";

const spring = { type: "spring" as const, bounce: 0, duration: 0.55 };

type Props = {
  items: RouteStop[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  compact?: boolean;
  totalMinutes?: number;
};

export function RouteVisual({ items, hoveredId, onHover, compact = false, totalMinutes }: Props) {
  const total = totalMinutes ?? items.reduce((sum, item) => sum + item.minutes, 0) ?? 45;
  return (
    <ol className="route-visual" aria-label="Today’s recommended route">
      {items.map((item) => {
        const weight = Math.max(16, Math.round((item.minutes / Math.max(total, 1)) * 100));
        const active = hoveredId === item.id;
        return (
          <motion.li
            layout
            key={item.id}
            className={`route-stop${active ? " is-active" : ""}`}
            transition={spring}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(item.id)}
            onBlur={() => onHover(null)}
            tabIndex={0}
          >
            <span className="route-mins">
              <span className="num">{item.minutes}</span>
              <span className="unit">MIN</span>
            </span>
            <div className="route-body">
              <div className="route-bar-track" aria-hidden="true">
                <motion.span
                  className="route-bar"
                  initial={false}
                  animate={{ width: `${weight}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
                />
              </div>
              <p className="route-name">{item.name}</p>
              {!compact ? <p className="route-reason">{item.reason}</p> : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
