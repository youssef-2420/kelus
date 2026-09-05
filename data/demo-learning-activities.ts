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
};

export function createDemoLearningActivities(): LearningActivity[] {
  return Object.entries(ACTIVITIES).map(([conceptId, activity]) => ({
    id: `activity-${conceptId}`,
    conceptId,
    ...activity,
    // Demo lessons are deterministic course-model content. No uploaded source is
    // cited until source processing exists and produces a verifiable reference.
    sourceReferences: [],
  }));
}
