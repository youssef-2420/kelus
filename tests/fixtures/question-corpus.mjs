/**
 * Realistic lecture notes in the shapes students actually have: prose, slide bullets, flattened tables,
 * numbered steps, conditional rules, definitions with numbers. Grouped by course so "other topics" are realistic.
 * Used by the question review script and the quality tests. Text is written for this bench, not copied.
 */
export const COURSES = {
  economics: {
    siblings: ["Price elasticity of demand", "Supply and demand", "Market structures", "Fiscal policy"],
    topics: {
      "Price elasticity of demand": `Price elasticity of demand measures how strongly the quantity demanded responds to a change in price. Demand is elastic when buyers react strongly to a price change, and inelastic when they barely react. Close substitutes make demand more elastic because buyers can switch when the price rises. Necessities such as medicine usually have inelastic demand because there are few substitutes. Over a longer time horizon, demand becomes more elastic because buyers have time to adjust. When demand is inelastic, a price rise increases total revenue for the seller. When demand is elastic, a price rise decreases total revenue.`,
      "Supply and demand": `• The demand curve slopes downward: a higher price reduces the quantity demanded
• The supply curve slopes upward: a higher price increases the quantity supplied
• Equilibrium is where quantity demanded equals quantity supplied
• A shortage occurs when the price is below equilibrium
• A surplus occurs when the price is above equilibrium
• An increase in demand shifts the demand curve right and raises the equilibrium price
• An increase in supply shifts the supply curve right and lowers the equilibrium price`,
      "Market structures": `Perfect competition: many firms, identical products, free entry, firms are price takers
Monopoly: one firm, no close substitutes, high barriers to entry, the firm is a price maker
Oligopoly: a few large firms, strategic interdependence, barriers to entry
Monopolistic competition: many firms, differentiated products, free entry`,
      "Fiscal policy": `Fiscal policy is the use of government spending and taxation to influence the economy. Expansionary fiscal policy raises spending or cuts taxes to increase aggregate demand during a recession. Contractionary fiscal policy cuts spending or raises taxes to reduce inflation. The multiplier effect means each dollar of government spending raises national income by more than one dollar because recipients spend part of it. A budget deficit occurs when spending exceeds tax revenue.`,
    },
  },
  biology: {
    siblings: ["Cellular respiration", "Photosynthesis", "Mitosis", "Enzymes"],
    topics: {
      "Cellular respiration": `Cellular respiration is the process by which cells convert glucose and oxygen into ATP, carbon dioxide and water. It occurs in three stages: glycolysis, the Krebs cycle and the electron transport chain. Glycolysis takes place in the cytoplasm and splits one glucose molecule into two pyruvate molecules, producing a net gain of 2 ATP. The Krebs cycle occurs in the mitochondrial matrix and produces NADH and FADH2. The electron transport chain, located on the inner mitochondrial membrane, produces most of the ATP, about 32 to 34 molecules per glucose. Oxygen is the final electron acceptor; without it the chain stops and cells rely on fermentation, which makes far less ATP.`,
      "Photosynthesis": `1. Light is absorbed by chlorophyll in the thylakoid membranes of the chloroplast
2. Light energy splits water, releasing oxygen and producing ATP and NADPH
3. The Calvin cycle in the stroma uses ATP and NADPH to fix carbon dioxide into glucose
Overall equation: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2
The light reactions need light; the Calvin cycle does not use light directly but depends on the products of the light reactions.`,
      "Mitosis": `Mitosis is the division of a nucleus that produces two genetically identical daughter cells. It has four main phases. In prophase the chromosomes condense and the nuclear envelope breaks down. In metaphase the chromosomes line up along the cell's equator. In anaphase the sister chromatids are pulled apart to opposite poles. In telophase two new nuclei form around the separated chromosomes. Cytokinesis then divides the cytoplasm.`,
      "Enzymes": `Enzymes are biological catalysts, almost always proteins, that speed up reactions by lowering the activation energy. Each enzyme has an active site whose shape fits a specific substrate, which is why enzymes are specific. Temperature and pH change the shape of the active site; above the optimum temperature the enzyme denatures and stops working. A competitive inhibitor binds the active site and blocks the substrate, while a non-competitive inhibitor binds elsewhere and changes the shape of the active site. Raising the substrate concentration can overcome competitive inhibition but not non-competitive inhibition.`,
    },
  },
  history: {
    siblings: ["Causes of the French Revolution", "The Terror", "Napoleon's rise", "The Congress of Vienna"],
    topics: {
      "Causes of the French Revolution": `By 1789 France was close to bankruptcy because of the cost of the Seven Years' War and its support for the American Revolution. The tax burden fell on the Third Estate, while the clergy and nobility were largely exempt. Poor harvests in 1788 raised the price of bread and made urban workers desperate. Enlightenment ideas about rights and equality undermined the legitimacy of absolute monarchy. When Louis XVI summoned the Estates-General in May 1789, the Third Estate demanded a vote by head, not by order, and declared itself the National Assembly in June.`,
      "The Terror": `The Terror lasted from September 1793 to July 1794. The Committee of Public Safety, led by Robespierre, used revolutionary tribunals to execute suspected enemies of the Republic. About 17,000 people were officially executed, and many more died in prison. The Law of Suspects of September 1793 allowed arrest on vague grounds. The Terror ended when Robespierre was overthrown and executed on 28 July 1794.`,
      "Napoleon's rise": `Napoleon came to prominence as an artillery officer who won victories in Italy in 1796 and 1797. In 1799 he took part in the coup of 18 Brumaire, which ended the Directory and made him First Consul. The Concordat of 1801 reconciled the state with the Catholic Church. The Napoleonic Code of 1804 gave France a uniform legal system based on equality before the law. He crowned himself Emperor in December 1804.`,
      "The Congress of Vienna": `The Congress of Vienna met in 1814 and 1815 to remake Europe after Napoleon. Its aims were to restore legitimate monarchs, to create a balance of power so that no state could dominate Europe, and to contain France. Austria's Metternich was the leading figure. France was returned to its 1789 borders. The settlement kept the major powers at peace for about forty years, although it ignored nationalism and liberal demands.`,
    },
  },
  computing: {
    siblings: ["Binary search", "Hash tables", "Big O notation", "Recursion"],
    topics: {
      "Binary search": `Binary search finds a target in a sorted array by repeatedly halving the search range. First compare the target with the middle element. If they are equal, the search is finished. If the target is smaller, repeat the search on the left half; if it is larger, repeat on the right half. Binary search runs in O(log n) time, while a linear scan takes O(n). It only works if the array is sorted; on an unsorted array the result is meaningless.`,
      "Hash tables": `A hash table stores key-value pairs and uses a hash function to turn a key into an array index. Lookup, insertion and deletion take O(1) time on average. A collision happens when two keys hash to the same index. Chaining resolves collisions by storing a linked list at each index, while open addressing probes for the next free slot. As the load factor grows, collisions become more frequent and performance falls, so tables are resized when they get too full.`,
      "Big O notation": `Big O notation describes how the running time or space of an algorithm grows as the input size n grows. It ignores constant factors and lower-order terms, so 3n + 10 is O(n). Common classes from fastest to slowest are O(1), O(log n), O(n), O(n log n), O(n²) and O(2ⁿ). Big O gives an upper bound on growth, so it describes the worst case unless stated otherwise.`,
      "Recursion": `A recursive function solves a problem by calling itself on a smaller version of the same problem. Every recursive function needs a base case that stops the recursion; without it the function calls itself forever and the stack overflows. Each call is placed on the call stack and removed when it returns. Factorial is a classic example: n! = n × (n−1)!, with the base case 0! = 1.`,
    },
  },
  chemistry: {
    siblings: ["Le Chatelier's principle", "Acids and bases", "Reaction rates", "Chemical equilibrium"],
    topics: {
      "Le Chatelier's principle": `Le Chatelier's principle states that when a system at equilibrium is disturbed, it shifts to oppose the change. If the concentration of a reactant is increased, the equilibrium shifts toward the products. If the pressure is increased, the equilibrium shifts toward the side with fewer moles of gas. If the temperature is increased, an endothermic reaction shifts toward the products, while an exothermic reaction shifts toward the reactants. A catalyst speeds up both directions equally and does not change the position of equilibrium.`,
      "Acids and bases": `An acid donates a proton and a base accepts a proton, according to the Brønsted–Lowry definition. pH is defined as −log10 of the hydrogen ion concentration, so a solution of pH 3 is ten times more acidic than a solution of pH 4. Strong acids such as hydrochloric acid dissociate completely in water, while weak acids such as ethanoic acid dissociate only partially. At 25 °C neutral water has a pH of 7.`,
      "Reaction rates": `The rate of a reaction is the change in concentration of a reactant or product per unit time. Collision theory says a reaction occurs only when particles collide with enough energy, called the activation energy, and with the correct orientation. Increasing the temperature increases the fraction of particles with enough energy, so the rate rises. Increasing the concentration increases the collision frequency. A catalyst provides an alternative pathway with a lower activation energy.`,
      "Chemical equilibrium": `A reversible reaction reaches dynamic equilibrium when the rate of the forward reaction equals the rate of the reverse reaction. At equilibrium the concentrations of reactants and products stay constant, but the reactions have not stopped. The equilibrium constant Kc is the ratio of product concentrations to reactant concentrations, each raised to the power of its coefficient. A large Kc means the equilibrium lies toward the products.`,
    },
  },
  law: {
    siblings: ["Formation of a contract", "Negligence", "Remedies for breach", "Consideration"],
    topics: {
      "Formation of a contract": `A valid contract requires four elements: offer, acceptance, consideration and intention to create legal relations. An offer is a clear statement of the terms on which the offeror is willing to be bound. Acceptance must be unqualified and communicated to the offeror; a counter-offer destroys the original offer. An invitation to treat, such as goods displayed in a shop window, is not an offer. In commercial agreements there is a presumption that the parties intended to be legally bound.`,
      "Negligence": `The tort of negligence has three elements: a duty of care, a breach of that duty, and damage caused by the breach. The duty of care was established in Donoghue v Stevenson (1932) through the neighbour principle. The standard of care is that of the reasonable person. The claimant must show that the damage was caused by the breach, applying the but-for test, and that it was not too remote.`,
      "Remedies for breach": `The usual remedy for breach of contract is damages, which aim to put the claimant in the position they would have been in if the contract had been performed. Damages are limited by remoteness and by the duty to mitigate loss. Specific performance is an equitable remedy that orders the defendant to perform and is available only where damages would be inadequate, for example for the sale of unique land. It is not available for contracts of personal service.`,
      "Consideration": `Consideration is something of value given in exchange for a promise. It must be sufficient but need not be adequate, so a court will not examine whether the price was fair. Past consideration is no consideration, because the act was done before the promise was made. A promise to do something you are already legally bound to do is generally not good consideration.`,
    },
  },
  physics: {
    siblings: ["Newton's laws", "Kinetic energy", "Momentum", "Circular motion"],
    topics: {
      "Newton's laws": `Newton's first law states that an object stays at rest or in uniform motion unless acted on by a resultant force. The second law states that the resultant force equals mass times acceleration, F = ma, so for a constant force a larger mass gives a smaller acceleration. The third law states that when body A exerts a force on body B, B exerts an equal and opposite force on A. These two forces act on different bodies, so they never cancel each other.`,
      "Kinetic energy": `Kinetic energy is the energy an object has because of its motion, given by KE = ½mv². Doubling the speed of an object quadruples its kinetic energy, because the speed is squared. The work done by the resultant force on an object equals the change in its kinetic energy. Kinetic energy is measured in joules and is never negative.`,
      "Momentum": `Momentum is the product of mass and velocity, p = mv, and is measured in kg m/s. In a closed system momentum is conserved, so the total momentum before a collision equals the total momentum after it. In an elastic collision kinetic energy is also conserved, whereas in an inelastic collision some kinetic energy is transferred to other forms. Impulse is force multiplied by time and equals the change in momentum.`,
      "Circular motion": `An object moving in a circle at constant speed is accelerating because its direction keeps changing. The resultant force, called the centripetal force, points toward the centre of the circle. The centripetal acceleration is a = v²/r. If the centripetal force disappears, the object moves off in a straight line along the tangent, not outward along the radius.`,
    },
  },
};

export function* allTopics() {
  for (const [course, { siblings, topics }] of Object.entries(COURSES)) {
    for (const [name, text] of Object.entries(topics)) yield { course, name, text, siblings };
  }
}
