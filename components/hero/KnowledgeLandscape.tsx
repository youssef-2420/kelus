"use client";

import { ActiveRoute } from "./ActiveRoute";
import { Destination } from "./Destination";
import { KnowledgeNode } from "./KnowledgeNode";
import { RouteSignal } from "./RouteSignal";
import {
  NEW_ROUTE,
  NEW_STOPS,
  OLD_ROUTE,
  OLD_STOPS,
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
  const routeStops = showNew ? NEW_STOPS : OLD_STOPS;
  const onRoute = new Set<string>(routeStops);
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
          d="M 60 680 C 280 520, 520 320, 780 140 C 900 70, 1000 40, 1080 24"
          fill="none"
          stroke="currentColor"
        />
        <path
          d="M 40 360 C 240 300, 560 280, 980 160"
          fill="none"
          stroke="currentColor"
        />
        <path
          d="M 200 80 C 340 220, 500 460, 580 700"
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
        <text className="hero-route-kicker" x={layout === "mobile" ? 180 : 500} y={layout === "mobile" ? 470 : 318}>
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
          onRoute={onRoute.has(node.id)}
          elasticityMastery={elasticityMastery}
        />
      ))}
    </svg>
  );
}
