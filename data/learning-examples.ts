export const LEARNING_EXAMPLES = [
  {
    id: "biology", label: "Biology", course: "Molecular Biology", destination: "Cell Biology final", days: 12,
    concepts: ["Cell membranes", "Osmosis", "Homeostasis"] as const,
    moved: "Active transport",
    question: "Why does water move across a selectively permeable membrane?",
    answer: "Water moves by osmosis from higher to lower water potential across a membrane that lets water pass. Dissolved solutes affect that water potential.",
    route: [
      { name: "Osmosis", minutes: 18, reason: "Recall was uncertain" },
      { name: "Cell respiration", minutes: 15, reason: "High exam value" },
      { name: "Homeostasis", minutes: 12, reason: "Builds on both" },
    ],
    signal: "Osmosis moved first after an uncertain recall answer.",
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
