"use client";

import type { Layout } from "./landscape-data";
import { NODE_MAP } from "./landscape-data";

type Props = {
  layout: Layout;
};

export function Destination({ layout }: Props) {
  const node = NODE_MAP.target;
  const x = node.x[layout];
  const y = node.y[layout];
  const align = layout === "mobile" ? "middle" : "start";
  const tx = layout === "mobile" ? x : x + 16;
  const ty = layout === "mobile" ? y - 28 : y - 8;

  return (
    <g className="hero-destination" transform={`translate(${tx} ${ty})`}>
      <text className="hero-kicker-svg" textAnchor={align} y={0}>
        Target · 11 days
      </text>
      <text className="hero-dest-name" textAnchor={align} y={22}>
        Microeconomics Final
      </text>
      <text className="hero-dest-num" textAnchor={align} y={48}>
        85%
      </text>
    </g>
  );
}
