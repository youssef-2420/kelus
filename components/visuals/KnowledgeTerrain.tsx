"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

type RouteState = "initial" | "rerouting" | "updated";

const concepts = [
  { id: "supply", label: "Supply & Demand", x: 152, y: 382, mastery: 71, importance: "High" },
  { id: "elasticity", label: "Elasticity", x: 300, y: 300, mastery: 42, importance: "Very high" },
  { id: "markets", label: "Market Structures", x: 492, y: 248, mastery: 58, importance: "Very high" },
  { id: "choice", label: "Consumer Choice", x: 212, y: 154, mastery: 64, importance: "Medium" },
  { id: "monetary", label: "Monetary Policy", x: 374, y: 414, mastery: 55, importance: "High" },
  { id: "fiscal", label: "Fiscal Policy", x: 526, y: 438, mastery: 68, importance: "High" },
  { id: "game", label: "Game Theory", x: 558, y: 116, mastery: 37, importance: "Low" },
] as const;

const initialRoute = "M 54 476 C 86 438 112 411 152 382 C 204 346 242 329 300 300 C 365 267 422 258 492 248 C 548 238 584 203 618 164";
const updatedRoute = "M 54 476 C 122 437 214 352 300 300 C 326 328 350 375 374 414 C 426 362 454 296 492 248 C 548 238 584 203 618 164";

function Detail({ id, updated }: { id: string; updated: boolean }) {
  const concept = concepts.find((item) => item.id === id);
  if (!concept) return null;
  const mastery = concept.id === "elasticity" && updated ? 46 : concept.mastery;
  return (
    <motion.aside
      className="terrain-detail"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <span>Why now?</span>
      <strong>{concept.label}</strong>
      <dl><div><dt>Mastery</dt><dd>{mastery}%</dd></div><div><dt>Exam value</dt><dd>{concept.importance}</dd></div></dl>
      <p>{concept.id === "elasticity" ? "High exam value · low recall" : "Connected to today’s recommended route"}</p>
    </motion.aside>
  );
}

export function KnowledgeTerrain() {
  const reduceMotion = useReducedMotion() === true;
  const root = useRef<HTMLDivElement>(null);
  const [routeState, setRouteState] = useState<RouteState>(reduceMotion ? "updated" : "initial");
  const [activeId, setActiveId] = useState("elasticity");
  const updated = routeState === "updated";

  useEffect(() => {
    if (reduceMotion) return;
    let rerouteTimer = 0;
    let updateTimer = 0;
    let resetTimer = 0;
    const run = () => {
      rerouteTimer = window.setTimeout(() => setRouteState("rerouting"), 5000);
      updateTimer = window.setTimeout(() => setRouteState("updated"), 5600);
      resetTimer = window.setTimeout(() => { setRouteState("initial"); run(); }, 11_000);
    };
    run();
    return () => { window.clearTimeout(rerouteTimer); window.clearTimeout(updateTimer); window.clearTimeout(resetTimer); };
  }, [reduceMotion]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !root.current) return;
    const bounds = root.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    root.current.style.setProperty("--terrain-bg-x", `${x * 2}px`);
    root.current.style.setProperty("--terrain-bg-y", `${y * 2}px`);
    root.current.style.setProperty("--terrain-mid-x", `${x * 4}px`);
    root.current.style.setProperty("--terrain-mid-y", `${y * 4}px`);
    root.current.style.setProperty("--terrain-front-x", `${x * 6}px`);
    root.current.style.setProperty("--terrain-front-y", `${y * 6}px`);
  }

  return (
    <div
      ref={root}
      id="learning-terrain"
      className="knowledge-terrain"
      onPointerMove={move}
      onPointerLeave={() => {
        root.current?.style.setProperty("--terrain-bg-x", "0px");
        root.current?.style.setProperty("--terrain-bg-y", "0px");
        root.current?.style.setProperty("--terrain-mid-x", "0px");
        root.current?.style.setProperty("--terrain-mid-y", "0px");
        root.current?.style.setProperty("--terrain-front-x", "0px");
        root.current?.style.setProperty("--terrain-front-y", "0px");
      }}
      aria-label="Kelus learning map showing one recommended route through several possible concepts"
    >
      <div className="terrain-head">
        <span>Kelus learning map</span>
        <AnimatePresence mode="wait">
          <motion.b key={routeState} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} aria-live="polite">
            {routeState === "rerouting" ? "Rerouting…" : updated ? "Route updated" : "Today · 45 min"}
          </motion.b>
        </AnimatePresence>
      </div>

      <svg className="terrain-map" viewBox="0 0 680 540" role="img" aria-labelledby="terrain-title terrain-desc">
        <title id="terrain-title">A learning route through a microeconomics course</title>
        <desc id="terrain-desc">Seven connected concepts surround one highlighted route from the learner’s current state to an exam target.</desc>
        <defs>
          <pattern id="terrain-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" /></pattern>
        </defs>
        <rect className="terrain-grid" width="680" height="540" fill="url(#terrain-grid)" />
        <g className="terrain-middle">
          <path d="M152 382 C164 288 176 213 212 154" />
          <path d="M212 154 C314 158 426 126 558 116" />
          <path d="M300 300 C331 333 349 378 374 414" />
          <path d="M374 414 C425 424 476 432 526 438" />
          <path d="M492 248 C527 202 542 158 558 116" />
          <path d="M492 248 C505 318 515 378 526 438" />
        </g>
        <motion.path
          className="terrain-route"
          d={initialRoute}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ d: updated ? updatedRoute : initialRoute, pathLength: 1, opacity: 1 }}
          transition={{ d: { duration: 0.55, ease: [0.65, 0, 0.35, 1] }, pathLength: { duration: 1.4, delay: 0.9, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.25 } }}
        />
        {!reduceMotion ? (
          <motion.circle
            className="terrain-signal"
            r="3.5"
            animate={updated
              ? { cx: [54, 300, 374, 492, 618], cy: [476, 300, 414, 248, 164] }
              : { cx: [54, 152, 300, 492, 618], cy: [476, 382, 300, 248, 164] }}
            transition={{ duration: 5.6, repeat: Infinity, ease: "linear" }}
          />
        ) : null}

        <g className="terrain-you"><circle cx="54" cy="476" r="18" /><text x="54" y="480">YOU</text></g>
        <g className="terrain-target"><circle cx="618" cy="164" r="36" /><circle cx="618" cy="164" r="27" /><text x="618" y="159">EXAM</text><text x="618" y="176">85%</text></g>

        {concepts.map((concept, index) => {
          const onRoute = ["supply", "elasticity", "markets"].includes(concept.id) || (updated && concept.id === "monetary");
          const dimmed = updated && concept.id === "supply";
          return (
            <motion.g
              key={concept.id}
              className={`terrain-node terrain-${concept.id}${onRoute && !dimmed ? " is-route" : ""}${activeId === concept.id ? " is-active" : ""}`}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: dimmed ? 0.45 : 1 }}
              transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.38 + index * 0.07 }}
              role="button"
              tabIndex={0}
              aria-label={`${concept.label}, ${concept.mastery}% mastery`}
              onMouseEnter={() => setActiveId(concept.id)}
              onMouseLeave={() => setActiveId("elasticity")}
              onFocus={() => setActiveId(concept.id)}
              onBlur={() => setActiveId("elasticity")}
            >
              <circle cx={concept.x} cy={concept.y} r="7" />
              <text x={concept.x + 14} y={concept.y - 7}>{concept.label}</text>
              <text className="terrain-value" x={concept.x + 14} y={concept.y + 12}>{concept.id === "elasticity" && updated ? "46" : concept.mastery}% mastery</text>
            </motion.g>
          );
        })}
      </svg>

      <AnimatePresence mode="wait"><Detail key={`${activeId}-${updated}`} id={activeId} updated={updated} /></AnimatePresence>
      <p className="terrain-signal-copy"><span aria-hidden="true">↳</span>{routeState === "rerouting" ? "New learning signal detected" : updated ? "Monetary Policy moved into today’s route" : "Hover a concept to inspect the reasoning"}</p>
    </div>
  );
}
