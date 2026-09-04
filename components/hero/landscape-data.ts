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

export const VIEW = { w: 1000, h: 860 } as const;

export const NODES: KnowledgeNode[] = [
  {
    id: "you",
    kind: "you",
    name: "You are here",
    x: { desktop: 292, mobile: 168 },
    y: { desktop: 678, mobile: 690 },
    mastery: 67,
    signal: null,
  },
  {
    id: "supply",
    kind: "concept",
    name: "Supply & Demand",
    x: { desktop: 428, mobile: 168 },
    y: { desktop: 548, mobile: 560 },
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
    x: { desktop: 552, mobile: 168 },
    y: { desktop: 428, mobile: 500 },
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
    x: { desktop: 708, mobile: 168 },
    y: { desktop: 268, mobile: 300 },
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
    x: { desktop: 148, mobile: 52 },
    y: { desktop: 368, mobile: 430 },
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
    x: { desktop: 778, mobile: 278 },
    y: { desktop: 508, mobile: 400 },
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
    x: { desktop: 908, mobile: 300 },
    y: { desktop: 348, mobile: 240 },
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
    x: { desktop: 848, mobile: 168 },
    y: { desktop: 108, mobile: 108 },
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
      desktop: "M 292 678 C 330 660, 380 600, 428 548",
      mobile: "M 168 690 C 168 650, 168 600, 168 560",
    },
  },
  {
    id: "supply-elasticity",
    from: "supply",
    to: "elasticity",
    d: {
      desktop: "M 428 548 C 470 510, 510 470, 552 428",
      mobile: "M 168 560 C 168 540, 168 520, 168 500",
    },
  },
  {
    id: "you-consumer",
    from: "you",
    to: "consumer",
    d: {
      desktop: "M 292 678 C 220 600, 160 470, 148 368",
      mobile: "M 168 690 C 100 600, 60 500, 52 430",
    },
  },
  {
    id: "consumer-fiscal",
    from: "consumer",
    to: "fiscal",
    d: {
      desktop: "M 148 368 C 380 250, 700 280, 908 348",
      mobile: "M 52 430 C 140 300, 240 250, 300 240",
    },
  },
  {
    id: "elasticity-monetary",
    from: "elasticity",
    to: "monetary",
    d: {
      desktop: "M 552 428 C 620 430, 720 490, 778 508",
      mobile: "M 168 500 C 200 470, 250 430, 278 400",
    },
  },
  {
    id: "monetary-markets",
    from: "monetary",
    to: "markets",
    d: {
      desktop: "M 778 508 C 800 420, 760 320, 708 268",
      mobile: "M 278 400 C 240 360, 190 320, 168 300",
    },
  },
  {
    id: "supply-monetary",
    from: "supply",
    to: "monetary",
    d: {
      desktop: "M 428 548 C 540 590, 680 560, 778 508",
      mobile: "M 168 560 C 220 520, 260 450, 278 400",
    },
  },
  {
    id: "fiscal-target",
    from: "fiscal",
    to: "target",
    d: {
      desktop: "M 908 348 C 920 250, 890 160, 848 108",
      mobile: "M 300 240 C 250 180, 200 130, 168 108",
    },
  },
];

export const OLD_ROUTE: Record<Layout, string> = {
  desktop:
    "M 292 678 C 340 655, 390 600, 428 548 C 470 508, 514 468, 552 428 C 610 370, 660 320, 708 268 C 760 210, 810 150, 848 108",
  mobile:
    "M 168 690 C 168 640, 168 560, 168 500 C 168 430, 168 350, 168 300 C 168 230, 168 160, 168 108",
};

export const NEW_ROUTE: Record<Layout, string> = {
  desktop:
    "M 292 678 C 380 620, 490 500, 552 428 C 630 420, 720 490, 778 508 C 800 430, 760 320, 708 268 C 760 210, 810 150, 848 108",
  mobile:
    "M 168 690 C 168 600, 168 540, 168 500 C 210 470, 260 430, 278 400 C 240 360, 190 330, 168 300 C 168 230, 168 160, 168 108",
};

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
