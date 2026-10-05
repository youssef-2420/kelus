import type { ReactNode } from "react";
import styles from "./LoopSteps.module.css";

export type LoopStepId = "read" | "retrieve" | "use" | "mark";

const STEPS: Array<{ id: LoopStepId; label: string; line: string; art: ReactNode }> = [
  {
    id: "read",
    label: "Read",
    line: "A short explanation from your course",
    art: (
      <>
        <path d="M8 14C16 11 24 11 32 14V44C24 41 16 41 8 44Z" />
        <path d="M32 14C40 11 48 11 56 14V44C48 41 40 41 32 44Z" />
        <path d="M14 21H26M14 27H26M14 33H22M38 21H50M38 27H50" />
      </>
    ),
  },
  {
    id: "retrieve",
    label: "Retrieve",
    line: "Write it from memory, without looking",
    art: (
      <>
        <rect x="9" y="10" width="34" height="38" rx="2" />
        <path d="M16 22H36M16 30H36M16 38H28" strokeDasharray="2 4" />
        <path d="M44 46L56 20L60 22L48 48Z" />
        <path d="M44 46L43 53L48 48" />
      </>
    ),
  },
  {
    id: "use",
    label: "Use",
    line: "Apply it to a fresh prompt",
    art: (
      <>
        <rect x="8" y="12" width="30" height="24" rx="2" />
        <path d="M14 20H32M14 27H26" />
        <path d="M42 36C50 36 54 42 54 50" />
        <path d="M50 46L54 52L58 46" />
        <circle cx="22" cy="48" r="4" />
      </>
    ),
  },
  {
    id: "mark",
    label: "Mark",
    line: "Kelus updates your route",
    art: (
      <>
        <circle cx="32" cy="30" r="20" />
        <path d="M22 31L29 38L43 22" className={styles.tick} />
        <path d="M14 54H50" />
      </>
    ),
  },
];

/**
 * The Read → Retrieve → Use → Mark loop as four ink drawings.
 * Decorative art is aria-hidden; the ordered list carries the meaning.
 */
export function LoopSteps({ current, compact = false, label = "How each block works" }: { current?: LoopStepId; compact?: boolean; label?: string }) {
  const currentIndex = current ? STEPS.findIndex((step) => step.id === current) : -1;
  return (
    <ol className={`${styles.loop} ${compact ? styles.compact : ""}`} aria-label={label}>
      {STEPS.map((step, index) => (
        <li
          key={step.id}
          className={`${styles.step} ${current === step.id ? styles.isCurrent : ""} ${currentIndex > index ? styles.isDone : ""} ${step.id === "mark" ? styles.isMark : ""}`}
          aria-current={current === step.id ? "step" : undefined}
        >
          <svg className={styles.art} viewBox="0 0 64 60" aria-hidden="true" focusable="false">
            {step.art}
          </svg>
          <span className={styles.index} aria-hidden="true">{index + 1}</span>
          <strong>{step.label}</strong>
          {compact ? null : <span className={styles.line}>{step.line}</span>}
        </li>
      ))}
    </ol>
  );
}
