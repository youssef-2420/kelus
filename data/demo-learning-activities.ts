import type { LearningActivity } from "@/domain/types";

type ActivitySeed = Omit<LearningActivity, "id" | "conceptId" | "sourceReferences">;

const ACTIVITIES: Record<string, ActivitySeed> = {
  "c-supply-demand": {
    learn: {
      title: "Markets move toward a new balance.",
      explanation: "A demand or supply shift changes the quantity buyers and sellers want at the old price. Price then moves until quantity demanded and quantity supplied meet again.",
      keyPoints: ["A shift changes the whole curve; a price change moves along a curve.", "Hold the other curve constant before predicting the new equilibrium."],
    },
    retrieve: {
      prompt: "What happens to equilibrium price when demand rises and supply is unchanged?",
      hint: "At the old price, compare how much buyers want with how much sellers offer.",
      explanation: "Higher demand creates excess demand at the old price, so buyers compete for unchanged supply.",
      example: "If concert demand rises while seats stay fixed, the market-clearing ticket price rises.",
      modelAnswer: "Price rises as buyers compete for unchanged supply, moving the market to a new equilibrium.",
    },
    apply: {
      prompt: "A drought reduces the supply of wheat while demand is unchanged. Predict the direction of equilibrium price and quantity, and explain why.",
      hint: "Move the supply curve left, then read the new intersection.",
      modelAnswer: "Equilibrium price rises and equilibrium quantity falls because less wheat is supplied at every price.",
    },
  },
  "c-elasticity": {
    learn: {
      title: "Elasticity measures responsiveness, not direction.",
      explanation: "Price elasticity of demand asks how strongly quantity demanded responds to a price change. Close substitutes make switching easier, so the response is usually larger.",
      keyPoints: ["More substitutes usually mean more elastic demand.", "Necessities and short time horizons tend to reduce responsiveness."],
    },
    retrieve: {
      prompt: "Why does demand become more elastic when close substitutes exist?",
      hint: "Think about what a buyer can do immediately after one seller raises its price.",
      explanation: "Elasticity grows when buyers have an easy way to avoid the price increase.",
      example: "If one coffee shop raises its price and five similar shops are nearby, customers can switch quickly.",
      modelAnswer: "Buyers can switch when price rises, so quantity demanded responds more strongly to the price change.",
    },
    apply: {
      prompt: "Which is likely more price elastic: one brand of bottled water or water as a whole? Explain your choice.",
      hint: "Compare the number of close substitutes for each definition of the market.",
      modelAnswer: "One brand is more elastic because buyers can switch to many other water brands, while water as a whole has fewer close substitutes.",
    },
  },
  "c-consumer-choice": {
    learn: {
      title: "Choice is constrained by income and prices.",
      explanation: "The budget constraint maps every combination a consumer can afford. Its position depends on income; its slope reflects the relative prices of the two goods.",
      keyPoints: ["Higher income shifts the constraint outward.", "A price change rotates the constraint around an intercept."],
    },
    retrieve: {
      prompt: "What does the budget constraint represent?",
      hint: "Name the three pieces of information that limit affordable combinations.",
      explanation: "It is the boundary between affordable and unaffordable bundles at current income and prices.",
      example: "With $20, sandwiches at $5 and drinks at $2 create a line of affordable combinations.",
      modelAnswer: "The combinations of goods a consumer can afford at given prices and income.",
    },
    apply: {
      prompt: "If a consumer's income rises while both prices stay fixed, what happens to the budget constraint?",
      hint: "Ask whether relative prices changed or only purchasing power changed.",
      modelAnswer: "It shifts outward in parallel because the consumer can afford more of both goods while the relative-price slope stays unchanged.",
    },
  },
  "c-market-structures": {
    learn: {
      title: "Market power separates the structures.",
      explanation: "Market structures differ in the number of sellers, barriers to entry, product differentiation, and the power firms have over price.",
      keyPoints: ["Competitive firms take the market price as given.", "A monopolist faces the market demand curve and can influence price."],
    },
    retrieve: {
      prompt: "What feature most clearly separates perfect competition from monopoly?",
      hint: "Focus on whether an individual firm can influence the market price.",
      explanation: "The central distinction is market power, supported by seller count and barriers to entry.",
      example: "A wheat farmer is close to a price taker; a sole local utility has substantial market power.",
      modelAnswer: "The degree of market power: competitive firms are price takers, while a monopolist can influence price.",
    },
    apply: {
      prompt: "A market has many sellers but strongly differentiated brands. Which structure fits best, and why?",
      hint: "Combine the number of firms with whether products are identical.",
      modelAnswer: "Monopolistic competition fits best because many firms sell differentiated products and retain limited price-setting power.",
    },
  },
  "c-game-theory": {
    learn: {
      title: "Strategic choices depend on other players.",
      explanation: "Game theory studies decisions where each person's result depends on what others choose. A dominant strategy remains best across every action available to the other player.",
      keyPoints: ["List strategies and payoffs before judging a choice.", "A dominant strategy need not produce the best joint outcome."],
    },
    retrieve: {
      prompt: "What is a dominant strategy?",
      hint: "Test the same strategy against every possible move by the other player.",
      explanation: "Dominance is about a strategy's relative payoff under all of the opponent's choices.",
      example: "If confessing gives a prisoner a shorter sentence whether the partner confesses or stays silent, confessing is dominant.",
      modelAnswer: "A strategy that gives a player the best outcome regardless of what the other player chooses.",
    },
    apply: {
      prompt: "If a strategy is best only when the other player cooperates, is it dominant? Explain.",
      hint: "Dominance must survive every possible opposing action.",
      modelAnswer: "No. A dominant strategy must be the player's best choice for every action the other player might take.",
    },
  },
  "c-monetary-policy": {
    learn: {
      title: "Interest rates change spending incentives.",
      explanation: "Central banks can raise policy rates to make borrowing more expensive. That tends to restrain consumption and investment, reducing demand pressure in the economy.",
      keyPoints: ["The first channel is the cost of borrowing.", "The effect reaches inflation through weaker aggregate demand, often with a lag."],
    },
    retrieve: {
      prompt: "How can a higher policy interest rate reduce inflationary pressure?",
      hint: "Trace the chain from borrowing costs to spending and aggregate demand.",
      explanation: "The rate itself does not mechanically cut prices; it changes financing conditions and spending behavior.",
      example: "Higher mortgage and business-loan rates can delay home purchases and investment projects.",
      modelAnswer: "It raises borrowing costs, restrains demand and investment, and can reduce upward pressure on prices.",
    },
    apply: {
      prompt: "Why might a rate increase take time to affect inflation?",
      hint: "Consider existing contracts and how slowly households and firms change plans.",
      modelAnswer: "Loans, contracts, and spending plans adjust gradually, so tighter financial conditions pass through to demand and prices with a lag.",
    },
  },
  "c-fiscal-policy": {
    learn: {
      title: "Government budgets can shift aggregate demand.",
      explanation: "Fiscal policy changes government spending or taxation. Expansionary policy raises demand; contractionary policy reduces it, though the size and timing depend on implementation and household behavior.",
      keyPoints: ["Spending changes demand directly.", "Tax changes work through disposable income and behavior."],
    },
    retrieve: {
      prompt: "Name one expansionary fiscal-policy action.",
      hint: "Choose either the spending side or the tax side of the government budget.",
      explanation: "Expansionary actions are designed to increase aggregate demand.",
      example: "Funding new infrastructure directly increases government purchases and may support employment.",
      modelAnswer: "Increasing government spending or reducing taxes to raise aggregate demand.",
    },
    apply: {
      prompt: "Why might a tax cut raise aggregate demand by less than an equal increase in government spending?",
      hint: "Households do not necessarily spend every additional dollar of disposable income.",
      modelAnswer: "Some of the tax cut may be saved, while government spending enters aggregate demand directly.",
    },
  },

  "c-opportunity-cost": {
    learn: {
      title: "Every choice has a next-best alternative.",
      explanation: "Opportunity cost is the value of what you give up when you choose one option over another. Explicit money costs matter, but so do time and missed alternatives.",
      keyPoints: ["Compare the chosen option with the next-best forgone option.", "Ignore sunk costs that cannot be recovered."],
    },
    retrieve: {
      prompt: "What is opportunity cost?",
      hint: "Think about the value of the alternative you did not take.",
      explanation: "It measures the true trade-off behind a decision.",
      example: "Studying for two hours means forgoing two hours of paid work or rest.",
      modelAnswer: "The value of the next-best alternative forgone when a choice is made.",
    },
    apply: {
      prompt: "You can spend an evening reviewing elasticity or working a paid shift. How do you state the opportunity cost of reviewing?",
      hint: "Name the best alternative you give up.",
      modelAnswer: "The wages and experience from the paid shift you forgo by reviewing instead.",
    },
  },
  "c-comparative-advantage": {
    learn: {
      title: "Specialize where your opportunity cost is lower.",
      explanation: "Comparative advantage compares opportunity costs across producers. A person or country should specialize in the good they can produce at a lower opportunity cost, then trade.",
      keyPoints: ["Absolute advantage is about productivity; comparative advantage is about relative opportunity cost.", "Mutual gains from trade come from specialization."],
    },
    retrieve: {
      prompt: "When should a country specialize in a good?",
      hint: "Compare opportunity costs, not just raw productivity.",
      explanation: "Specialization follows the lower opportunity cost.",
      example: "A country may import cloth even if it can produce cloth, if its opportunity cost of cloth is higher than its partner's.",
      modelAnswer: "When it has a lower opportunity cost of producing that good than its trading partner.",
    },
    apply: {
      prompt: "Nation A forgoes 2 tons of wheat to make 1 machine; Nation B forgoes 5 tons of wheat to make 1 machine. Who has comparative advantage in machines?",
      hint: "Lower opportunity cost wins.",
      modelAnswer: "Nation A, because it gives up less wheat per machine.",
    },
  },
  "c-externalities": {
    learn: {
      title: "Some costs and benefits spill outside the market price.",
      explanation: "An externality arises when a transaction affects third parties. Negative externalities understate social cost; positive externalities understate social benefit.",
      keyPoints: ["Private markets ignore unpriced spillover effects.", "Policy can try to align private and social incentives."],
    },
    retrieve: {
      prompt: "What is a negative externality?",
      hint: "Think of a cost paid by someone outside the deal.",
      explanation: "The market price does not include that third-party cost.",
      example: "Factory pollution imposes health and cleanup costs on nearby residents.",
      modelAnswer: "A cost of production or consumption imposed on third parties not reflected in the market price.",
    },
    apply: {
      prompt: "Why might an unregulated polluting firm produce more than the socially efficient quantity?",
      hint: "Compare private marginal cost with social marginal cost.",
      modelAnswer: "It faces only private costs, so it ignores external damage and expands output past the social optimum.",
    },
  },
  "c-deadweight-loss": {
    learn: {
      title: "Missing trades destroy surplus.",
      explanation: "Deadweight loss is the surplus lost when quantity moves away from the efficient equilibrium—through taxes, quotas, monopoly pricing, or externalities.",
      keyPoints: ["It is the triangle of mutually beneficial trades that no longer happen.", "Larger distortions usually mean larger deadweight loss."],
    },
    retrieve: {
      prompt: "What does deadweight loss measure?",
      hint: "Focus on lost total surplus, not transfers.",
      explanation: "Transfers move surplus; deadweight loss destroys it.",
      example: "A tax that blocks some buyer–seller trades removes surplus neither side captures.",
      modelAnswer: "The loss of total surplus from producing a quantity different from the efficient market equilibrium.",
    },
    apply: {
      prompt: "A binding price ceiling creates a shortage. Where does deadweight loss appear?",
      hint: "Look for trades valued above cost that no longer occur.",
      modelAnswer: "In the units buyers value above sellers' cost but that are not exchanged because the ceiling blocks them.",
    },
  },
  "c-perfect-competition": {
    learn: {
      title: "Many price-takers, one market price.",
      explanation: "Perfect competition is a benchmark with many buyers and sellers, homogeneous products, free entry and exit, and firms that take price as given.",
      keyPoints: ["Firms produce where price equals marginal cost in the long-run benchmark.", "Entry drives economic profit toward zero in the long run."],
    },
    retrieve: {
      prompt: "Name one condition of perfect competition.",
      hint: "Think about numbers of firms, product sameness, or pricing power.",
      explanation: "Any core assumption of the competitive model works.",
      example: "A wheat farmer sells into a market too large for one farm to move the price.",
      modelAnswer: "Many buyers and sellers, a homogeneous product, free entry and exit, or price-taking firms.",
    },
    apply: {
      prompt: "Why can a perfectly competitive firm sell as much as it wants at the market price but nothing above it?",
      hint: "Buyers can switch to identical rivals.",
      modelAnswer: "Goods are perfect substitutes, so buyers refuse a higher price and the firm is a price taker.",
    },
  },
};

const DEMO_SOURCE = {
  materialId: "demo-syllabus-microeconomics",
  label: "Sample syllabus",
  locator: "demo · not your upload",
} as const;

export function createDemoLearningActivities(): LearningActivity[] {
  return Object.entries(ACTIVITIES).map(([conceptId, activity]) => ({
    id: `activity-${conceptId}`,
    conceptId,
    ...activity,
    // Honest sample citation: demo content is grounded in a sample syllabus,
    // not a user-uploaded file.
    sourceReferences: [DEMO_SOURCE],
  }));
}
