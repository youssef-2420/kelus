"use client";

import type { KnowledgeNode as NodeData, Layout, SignalKind } from "./landscape-data";
import { SIGNAL_COPY } from "./landscape-data";
import type { HeroPhase } from "./useHeroTimeline";
import { phaseAtLeast } from "./useHeroTimeline";

type Props = {
  node: NodeData;
  layout: Layout;
  phase: HeroPhase;
  hovered: boolean;
  onHover: (id: string | null) => void;
  elasticityMastery: number;
};

function radius(node: NodeData) {
  if (node.kind === "target") return 6;
  if (node.kind === "you") return 5;
  if (node.signal === "high-value") return 5.5;
  if (node.hiddenOnMobile) return 3.6;
  return 4.4;
}

function signalVisible(phase: HeroPhase, signal: SignalKind) {
  return Boolean(signal) && phaseAtLeast(phase, "signals");
}

export function KnowledgeNode({
  node,
  layout,
  phase,
  hovered,
  onHover,
  elasticityMastery,
}: Props) {
  const x = node.x[layout];
  const y = node.y[layout];
  const r = radius(node);
  const mastery = node.id === "elasticity" ? elasticityMastery : node.mastery;
  const showLabel = node.kind !== "you" && node.kind !== "target";
  const showSignal = signalVisible(phase, node.signal);
  const showLearn = node.id === "elasticity" && phase === "learn";
  const labelX = layout === "mobile" ? 0 : node.x.desktop > 700 ? 12 : -12;
  const anchor = layout === "mobile" ? "middle" : node.x.desktop > 700 ? "start" : "end";

  return (
    <g
      className={`hero-node hero-node-${node.kind}${hovered ? " is-hovered" : ""}${node.hiddenOnMobile ? " is-quiet" : ""}`}
      transform={`translate(${x} ${y})`}
      tabIndex={node.kind === "concept" ? 0 : undefined}
      onPointerEnter={() => node.kind === "concept" && onHover(node.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => node.kind === "concept" && onHover(node.id)}
      onBlur={() => onHover(null)}
    >
      {node.kind === "concept" ? (
        <circle r={hovered ? r + 10 : r + 8} fill="transparent" className="hero-node-hit" />
      ) : null}
      <circle
        r={r}
        fill={node.kind === "you" ? "var(--hero-ink)" : "var(--hero-paper)"}
        stroke={node.kind === "you" ? "var(--hero-ink)" : hovered ? "var(--hero-green)" : "var(--hero-ink)"}
        strokeWidth={hovered ? 1.75 : 1.15}
        strokeOpacity={node.hiddenOnMobile ? 0.45 : 0.85}
      />
      {showLabel ? (
        <text className="hero-node-name" textAnchor={anchor} x={labelX} y={layout === "mobile" ? -16 : -14}>
          {node.name}
        </text>
      ) : null}
      {node.kind === "you" ? (
        <g className="hero-here">
          <text className="hero-kicker-svg" textAnchor={layout === "mobile" ? "middle" : "start"} x={layout === "mobile" ? 0 : 14} y={layout === "mobile" ? 28 : -6}>
            You are here
          </text>
          <text className="hero-here-num" textAnchor={layout === "mobile" ? "middle" : "start"} x={layout === "mobile" ? 0 : 14} y={layout === "mobile" ? 52 : 18}>
            67%
          </text>
          <text className="hero-kicker-svg" textAnchor={layout === "mobile" ? "middle" : "start"} x={layout === "mobile" ? 0 : 70} y={layout === "mobile" ? 68 : 16}>
            Ready
          </text>
        </g>
      ) : null}
      {showSignal && node.signal ? (
        <text className="hero-signal" textAnchor={anchor} x={labelX} y={layout === "mobile" ? 20 : 18}>
          {mastery}% · {SIGNAL_COPY[node.signal]}
        </text>
      ) : null}
      {showLearn ? (
        <text className="hero-learn" textAnchor={anchor} x={labelX} y={layout === "mobile" ? 36 : 34}>
          Weaker than expected  42% → 46%
        </text>
      ) : null}
      {node.kind === "concept" ? (
        <title>{`${node.name}. ${mastery}% mastery.`}</title>
      ) : null}
    </g>
  );
}
