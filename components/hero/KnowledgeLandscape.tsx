"use client";

import { ActiveRoute } from "./ActiveRoute";
import { Destination } from "./Destination";
import { KnowledgeNode } from "./KnowledgeNode";
import { RouteSignal } from "./RouteSignal";
import {
  NEW_ROUTE,
  OLD_ROUTE,
  VIEW,
  quietPathsFor,
  visibleNodes,
  type Layout,
} from "./landscape-data";
import type { HeroPhase } from "./useHeroTimeline";
import { phaseAtLeast } from "./useHeroTimeline";

type Props = {
  layout: Layout;
  phase: HeroPhase;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  elasticityMastery: number;
  reduceMotion: boolean;
};

export function KnowledgeLandscape({
  layout,
  phase,
  hoveredId,
  onHover,
  elasticityMastery,
  reduceMotion,
}: Props) {
  const nodes = visibleNodes(layout);
  const quiet = quietPathsFor(layout);
  const showNew = phase === "updated";
  const fadingOld = phase === "rerouting";
  const routeD = showNew ? NEW_ROUTE[layout] : OLD_ROUTE[layout];
  const showSignal = !reduceMotion && phaseAtLeast(phase, "route");
  const showRouteLabel = reduceMotion || phaseAtLeast(phase, "route");

  return (
    <svg
      className="hero-landscape"
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      role="img"
      aria-label="A student at a desk inside a knowledge landscape. A recommended route runs from where they are now through Elasticity toward a Microeconomics final."
    >
      <g className="hero-layer-structure" aria-hidden="true">
        <path
          d="M 80 760 C 220 620, 420 500, 640 280 C 760 160, 860 80, 960 40"
          fill="none"
          stroke="currentColor"
        />
        <path
          d="M 40 420 C 200 360, 480 340, 820 220"
          fill="none"
          stroke="currentColor"
        />
        <path
          d="M 180 120 C 340 260, 520 520, 620 780"
          fill="none"
          stroke="currentColor"
        />
      </g>

      {quiet.map((path) => {
            const related = hoveredId && (path.from === hoveredId || path.to === hoveredId);
            return (
              <path
                key={path.id}
                className={`hero-quiet-path${related ? " is-related" : ""}`}
                d={path.d[layout]}
                pathLength={1}
                fill="none"
                stroke="currentColor"
                strokeWidth={related ? 1.4 : 1}
              />
            );
          })}

      <g className={fadingOld ? "is-fading" : undefined} style={fadingOld ? { opacity: 0.18 } : undefined}>
        {!showNew ? <ActiveRoute d={OLD_ROUTE[layout]} layout={layout} variant="old" /> : null}
      </g>

      {showNew ? <ActiveRoute key="new" d={NEW_ROUTE[layout]} layout={layout} variant="new" /> : null}

      {showSignal ? <RouteSignal key={routeD} d={routeD} /> : null}

      {showRouteLabel ? (
        <text className="hero-route-kicker" x={layout === "mobile" ? 168 : 470} y={layout === "mobile" ? 630 : 598}>
          Your route
        </text>
      ) : null}

      <Destination layout={layout} />

      {nodes.map((node) => (
        <KnowledgeNode
          key={node.id}
          node={node}
          layout={layout}
          phase={phase}
          hovered={hoveredId === node.id}
          onHover={onHover}
          elasticityMastery={elasticityMastery}
        />
      ))}
    </svg>
  );
}
