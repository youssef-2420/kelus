export type ConceptRow = {
  id: string;
  name: string;
  mastery: number;
  importance: "Very high importance" | "High importance" | "Low importance";
  why: {
    importance: string;
    mastery: string;
    value: string;
  };
};

export const HERO_CONCEPTS: ConceptRow[] = [
  {
    id: "game",
    name: "Game Theory",
    mastery: 37,
    importance: "Low importance",
    why: {
      importance: "Low exam importance",
      mastery: "Low mastery — still not first",
      value: "Weakest is not the same as next",
    },
  },
  {
    id: "elasticity",
    name: "Elasticity",
    mastery: 42,
    importance: "Very high importance",
    why: {
      importance: "Very high exam importance",
      mastery: "Low mastery",
      value: "High expected study value",
    },
  },
  {
    id: "monetary",
    name: "Monetary Policy",
    mastery: 55,
    importance: "High importance",
    why: {
      importance: "High exam importance",
      mastery: "Fading",
      value: "Important prerequisite",
    },
  },
  {
    id: "fiscal",
    name: "Fiscal Policy",
    mastery: 68,
    importance: "High importance",
    why: {
      importance: "High exam relevance",
      mastery: "Stable enough to review, not rebuild",
      value: "Efficient minutes before the exam",
    },
  },
];

export type RouteStop = {
  id: string;
  minutes: number;
  name: string;
  reason: string;
  why?: ConceptRow["why"];
};

export const HERO_ROUTE: RouteStop[] = [
  {
    id: "elasticity",
    minutes: 18,
    name: "Elasticity",
    reason: "High exam value · Low mastery",
    why: HERO_CONCEPTS.find((item) => item.id === "elasticity")?.why,
  },
  {
    id: "monetary",
    minutes: 12,
    name: "Monetary Policy",
    reason: "Important prerequisite · Fading",
    why: HERO_CONCEPTS.find((item) => item.id === "monetary")?.why,
  },
  {
    id: "fiscal",
    minutes: 10,
    name: "Fiscal Policy",
    reason: "High exam relevance",
    why: HERO_CONCEPTS.find((item) => item.id === "fiscal")?.why,
  },
  {
    id: "mixed",
    minutes: 5,
    name: "Mixed Retrieval",
    reason: "Quick checks across today’s topics",
    why: {
      importance: "Protects what you just studied",
      mastery: "Mixed retrieval, not a new topic",
      value: "Locks the session in",
    },
  },
];

export const TOMORROW_ROUTE = [
  { id: "elasticity", name: "Elasticity", note: "remains high priority" },
  { id: "monetary", name: "Monetary Policy", note: "moves upward" },
  { id: "markets", name: "Market Structures", note: "moves later" },
] as const;

export const ROUTE_TOTAL_MINUTES = 45;
