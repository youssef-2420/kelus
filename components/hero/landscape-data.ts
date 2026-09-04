export type Layout = "desktop" | "mobile";

export type NodeKind = "you" | "concept" | "target";

export type SignalKind = "high-value" | "fading" | "strong" | null;

export type KnowledgeNode = {
  id: string;
  kind: NodeKind;
  name: string;
  x: Record<Layout, number>;
  y: Record<Layout, number>;
  mastery: number;
  signal: SignalKind;
  why?: {
    importance: string;
    mastery: string;
    value: string;
  };
  hiddenOnMobile?: boolean;
};

export const VIEW = { w: 1100, h: 740 } as const;

export const NODES: KnowledgeNode[] = [
  {
    id: "you",
    kind: "you",
    name: "You are here",
    x: { desktop: 96, mobile: 72 },
    y: { desktop: 600, mobile: 580 },
    mastery: 67,
    signal: null,
  },
  {
    id: "supply",
    kind: "concept",
    name: "Supply & Demand",
    x: { desktop: 368, mobile: 180 },
    y: { desktop: 492, mobile: 500 },
    mastery: 91,
    signal: "strong",
    hiddenOnMobile: true,
    why: {
      importance: "Foundational, already strong",
      mastery: "91% — stable",
      value: "Useful later, not first",
    },
  },
  {
    id: "elasticity",
    kind: "concept",
    name: "Elasticity",
    x: { desktop: 508, mobile: 180 },
    y: { desktop: 358, mobile: 430 },
    mastery: 42,
    signal: "high-value",
    why: {
      importance: "Very high exam importance",
      mastery: "Low mastery",
      value: "High expected learning value",
    },
  },
  {
    id: "markets",
    kind: "concept",
    name: "Market Structures",
    x: { desktop: 668, mobile: 180 },
    y: { desktop: 208, mobile: 250 },
    mastery: 58,
    signal: null,
    why: {
      importance: "High exam weight",
      mastery: "Partial — needs structure",
      value: "Closes the route to the exam",
    },
  },
  {
    id: "consumer",
    kind: "concept",
    name: "Consumer Choice",
    x: { desktop: 92, mobile: 56 },
    y: { desktop: 268, mobile: 360 },
    mastery: 74,
    signal: null,
    hiddenOnMobile: true,
    why: {
      importance: "Low exam priority this week",
      mastery: "Comfortable enough",
      value: "Parked — not the bottleneck",
    },
  },
  {
    id: "monetary",
    kind: "concept",
    name: "Monetary Policy",
    x: { desktop: 792, mobile: 292 },
    y: { desktop: 428, mobile: 340 },
    mastery: 55,
    signal: "fading",
    why: {
      importance: "High exam importance",
      mastery: "Fading",
      value: "Rises after a weak elasticity check",
    },
  },
  {
    id: "fiscal",
    kind: "concept",
    name: "Fiscal Policy",
    x: { desktop: 980, mobile: 310 },
    y: { desktop: 268, mobile: 190 },
    mastery: 68,
    signal: null,
    hiddenOnMobile: true,
    why: {
      importance: "Relevant, not urgent",
      mastery: "Stable enough to review later",
      value: "Efficient minutes, not today’s first stop",
    },
  },
  {
    id: "target",
    kind: "target",
    name: "Microeconomics Final",
    x: { desktop: 848, mobile: 180 },
    y: { desktop: 72, mobile: 88 },
    mastery: 85,
    signal: null,
  },
];

export const NODE_MAP = Object.fromEntries(NODES.map((node) => [node.id, node]));

export type QuietPath = {
  id: string;
  from: string;
  to: string;
  d: Record<Layout, string>;
};

export const QUIET_PATHS: QuietPath[] = [
  {
    id: "you-supply",
    from: "you",
    to: "supply",
    d: {
      desktop: "M 96 600 C 200 560, 300 520, 368 492",
      mobile: "M 72 580 C 120 540, 160 520, 180 500",
    },
  },
  {
    id: "supply-elasticity",
    from: "supply",
    to: "elasticity",
    d: {
      desktop: "M 368 492 C 410 450, 460 400, 508 358",
      mobile: "M 180 500 C 180 470, 180 450, 180 430",
    },
  },
  {
    id: "you-consumer",
    from: "you",
    to: "consumer",
    d: {
      desktop: "M 96 600 C 80 480, 88 360, 92 268",
      mobile: "M 72 580 C 70 480, 62 400, 56 360",
    },
  },
  {
    id: "consumer-fiscal",
    from: "consumer",
    to: "fiscal",
    d: {
      desktop: "M 92 268 C 360 180, 720 200, 980 268",
      mobile: "M 56 360 C 140 250, 240 200, 310 190",
    },
  },
  {
    id: "elasticity-monetary",
    from: "elasticity",
    to: "monetary",
    d: {
      desktop: "M 508 358 C 600 350, 720 400, 792 428",
      mobile: "M 180 430 C 220 400, 260 360, 292 340",
    },
  },
  {
    id: "monetary-markets",
    from: "monetary",
    to: "markets",
    d: {
      desktop: "M 792 428 C 820 340, 740 250, 668 208",
      mobile: "M 292 340 C 250 300, 200 270, 180 250",
    },
  },
  {
    id: "supply-monetary",
    from: "supply",
    to: "monetary",
    d: {
      desktop: "M 368 492 C 500 540, 680 500, 792 428",
      mobile: "M 180 500 C 230 450, 270 380, 292 340",
    },
  },
  {
    id: "fiscal-target",
    from: "fiscal",
    to: "target",
    d: {
      desktop: "M 980 268 C 960 180, 900 110, 848 72",
      mobile: "M 310 190 C 260 140, 210 110, 180 88",
    },
  },
];

export const OLD_ROUTE: Record<Layout, string> = {
  desktop:
    "M 96 600 C 220 560, 300 520, 368 492 C 410 448, 460 398, 508 358 C 560 310, 620 250, 668 208 C 730 160, 800 110, 848 72",
  mobile:
    "M 72 580 C 120 520, 160 470, 180 430 C 180 360, 180 300, 180 250 C 180 190, 180 130, 180 88",
};

export const NEW_ROUTE: Record<Layout, string> = {
  desktop:
    "M 96 600 C 280 500, 420 410, 508 358 C 600 348, 720 400, 792 428 C 820 340, 740 250, 668 208 C 730 160, 800 110, 848 72",
  mobile:
    "M 72 580 C 120 500, 160 450, 180 430 C 220 400, 270 360, 292 340 C 250 300, 200 270, 180 250 C 180 190, 180 130, 180 88",
};

export const OLD_STOPS = ["you", "supply", "elasticity", "markets", "target"] as const;
export const NEW_STOPS = ["you", "elasticity", "monetary", "markets", "target"] as const;

export const SIGNAL_COPY: Record<Exclude<SignalKind, null>, string> = {
  "high-value": "High value",
  fading: "Fading",
  strong: "Strong",
};

export function visibleNodes(layout: Layout) {
  return NODES.filter((node) => !(layout === "mobile" && node.hiddenOnMobile));
}

export function quietPathsFor(layout: Layout) {
  return QUIET_PATHS.filter((path) => {
    const from = NODE_MAP[path.from];
    const to = NODE_MAP[path.to];
    if (!from || !to) return false;
    if (layout === "mobile" && (from.hiddenOnMobile || to.hiddenOnMobile)) return false;
    return true;
  });
}
