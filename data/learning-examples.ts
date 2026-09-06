export const LEARNING_EXAMPLES = [
  {
    id: "biology", label: "Biology", course: "Molecular Biology", destination: "Cell Biology final", days: 12,
    concepts: ["Cell membranes", "Osmosis", "Homeostasis"] as const,
    moved: "Active transport",
    question: "Why does water move across a selectively permeable membrane?",
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
    route: [
      { name: "Labor movements", minutes: 18, reason: "Evidence needs strengthening" },
      { name: "Industrialization", minutes: 15, reason: "Core essay argument" },
      { name: "Social reform", minutes: 12, reason: "Connects the evidence" },
    ],
    signal: "Labor movements moved first because the essay evidence was incomplete.",
  },
] as const;

export type LearningExample = (typeof LEARNING_EXAMPLES)[number];
