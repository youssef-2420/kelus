export const LEARNING_EXAMPLES = [
  {
    id: "economics", label: "Economics", course: "Microeconomics", destination: "Microeconomics Final", days: 12,
    concepts: ["Elasticity", "Supply & Demand", "Market Structures"] as const,
    moved: "Price discrimination",
    question: "Why does demand become more elastic when close substitutes exist?",
    answer: "Buyers can switch when price rises, so quantity demanded responds more strongly to the price change.",
    route: [
      { name: "Elasticity", minutes: 18, reason: "Recall was uncertain" },
      { name: "Supply & Demand", minutes: 15, reason: "High exam value" },
      { name: "Market Structures", minutes: 12, reason: "Builds on both" },
    ],
    signal: "Elasticity moved first after an uncertain recall answer.",
  },
  {
    id: "computing", label: "Computer science", course: "Data Structures", destination: "Algorithms exam", days: 8,
    concepts: ["Arrays", "Hash tables", "Graph traversal"] as const,
    moved: "Collision handling",
    question: "Why can a hash table retrieve a value without scanning every item?",
    answer: "A hash function maps the key to a bucket. The table checks that bucket and resolves any collisions, instead of searching every entry. Lookup is usually constant time on average.",
    route: [
      { name: "Hash tables", minutes: 20, reason: "Weak retrieval evidence" },
      { name: "Graph traversal", minutes: 15, reason: "Highest exam weight" },
      { name: "Complexity", minutes: 10, reason: "Useful review window" },
    ],
    signal: "Hash tables moved first after the student missed collision handling.",
  },
  {
    id: "history", label: "History", course: "Modern History", destination: "European History essay", days: 16,
    concepts: ["Industrialization", "Labor movements", "Social reform"] as const,
    moved: "Urbanization",
    question: "How did industrialization change the bargaining power of workers?",
    answer: "Many workers initially had little individual bargaining power. Working together in factories also helped workers organize unions and strikes to negotiate pay and conditions. The outcome varied by place and period.",
    route: [
      { name: "Labor movements", minutes: 18, reason: "Evidence needs strengthening" },
      { name: "Industrialization", minutes: 15, reason: "Core essay argument" },
      { name: "Social reform", minutes: 12, reason: "Connects the evidence" },
    ],
    signal: "Labor movements moved first because the essay evidence was incomplete.",
  },
] as const;

export type LearningExample = (typeof LEARNING_EXAMPLES)[number];
