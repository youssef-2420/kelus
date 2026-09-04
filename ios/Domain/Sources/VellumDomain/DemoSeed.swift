import Foundation

public enum DemoSeed {
    public static func snapshot(now: Date = Date(timeIntervalSince1970: 1_757_030_400)) -> LearnerSnapshot {
        let profile = StudentProfile(id: "user-maya", displayName: "Maya")
        let course = Course(id: "course-micro", name: "Microeconomics", typicalMinutes: 45)
        let exam = Exam(
            id: "exam-final",
            courseId: course.id,
            date: now.addingTimeInterval(11 * LearnerConstants.secondsPerDay),
            targetGrade: 0.85,
            evidenceConfidence: 0.45
        )

        struct Seed {
            var id: String
            var name: String
            var importance: Double
            var difficulty: Double
            var mastery: Double
            var lastSuccessDays: Double
            var extras: [(daysAgo: Double, outcome: RetrievalOutcome)]
        }

        let seeds: [Seed] = [
            .init(id: "c-supply", name: "Supply & Demand", importance: 0.95, difficulty: 0.3, mastery: 0.91, lastSuccessDays: 1, extras: [(1, .success)]),
            .init(id: "c-elasticity", name: "Elasticity", importance: 0.95, difficulty: 0.55, mastery: 0.42, lastSuccessDays: 12, extras: [(12, .failure), (8, .partial)]),
            .init(id: "c-choice", name: "Consumer Choice", importance: 0.72, difficulty: 0.5, mastery: 0.61, lastSuccessDays: 6, extras: [(6, .success)]),
            .init(id: "c-markets", name: "Market Structures", importance: 0.7, difficulty: 0.45, mastery: 0.58, lastSuccessDays: 9, extras: [(9, .partial)]),
            .init(id: "c-fiscal", name: "Fiscal Policy", importance: 0.82, difficulty: 0.4, mastery: 0.68, lastSuccessDays: 5, extras: [(5, .success)]),
            .init(id: "c-monetary", name: "Monetary Policy", importance: 0.84, difficulty: 0.5, mastery: 0.55, lastSuccessDays: 11, extras: [(11, .success), (3, .partial)]),
            .init(id: "c-game", name: "Game Theory", importance: 0.38, difficulty: 0.7, mastery: 0.37, lastSuccessDays: 16, extras: [(16, .failure)]),
        ]

        var events: [LearningEvent] = []
        var concepts: [Concept] = []

        for (index, seed) in seeds.enumerated() {
            if seed.mastery > 0 {
                events.append(
                    LearningEvent(
                        id: "evt-seed-\(seed.id)",
                        conceptId: seed.id,
                        sessionId: nil,
                        kind: .seedRating,
                        outcome: seed.mastery >= 0.75 ? .success : seed.mastery >= 0.4 ? .partial : .failure,
                        promptId: nil,
                        responseText: nil,
                        masteryBefore: 0,
                        masteryAfter: seed.mastery,
                        createdAt: now.addingTimeInterval(-max(seed.lastSuccessDays, 20) * LearnerConstants.secondsPerDay)
                    )
                )
            }
            for (attemptIndex, extra) in seed.extras.enumerated() {
                events.append(
                    LearningEvent(
                        id: "evt-\(seed.id)-\(attemptIndex)",
                        conceptId: seed.id,
                        sessionId: "session-prior",
                        kind: .retrieval,
                        outcome: extra.outcome,
                        promptId: "p-\(seed.id)-1",
                        responseText: nil,
                        masteryBefore: seed.mastery,
                        masteryAfter: seed.mastery,
                        createdAt: now.addingTimeInterval(-extra.daysAgo * LearnerConstants.secondsPerDay)
                    )
                )
            }
            let base = Concept(
                id: seed.id,
                courseId: course.id,
                name: seed.name,
                importance: seed.importance,
                difficulty: seed.difficulty
            )
            concepts.append(
                LearnerModel.applying(
                    LearnerModel.recomputeConceptCache(
                        conceptId: seed.id,
                        difficulty: seed.difficulty,
                        events: events,
                        now: now
                    ),
                    to: base
                )
            )
            _ = index
        }

        let relationships: [ConceptRelationship] = [
            .init(id: "r1", fromId: "c-supply", toId: "c-elasticity", kind: .prerequisite),
            .init(id: "r2", fromId: "c-elasticity", toId: "c-choice", kind: .prerequisite),
            .init(id: "r3", fromId: "c-supply", toId: "c-markets", kind: .prerequisite),
            .init(id: "r4", fromId: "c-fiscal", toId: "c-monetary", kind: .related),
            .init(id: "r5", fromId: "c-supply", toId: "c-fiscal", kind: .related),
        ]

        let prompts: [RetrievalPrompt] = [
            .init(id: "p-c-supply-1", conceptId: "c-supply", question: "What happens to equilibrium price when demand rises and supply is unchanged?", modelAnswer: "Price rises and quantity traded rises until the market clears at the new intersection."),
            .init(id: "p-c-supply-2", conceptId: "c-supply", question: "Why does a binding price ceiling create a shortage?", modelAnswer: "Quantity demanded exceeds quantity supplied at the capped price, so some buyers cannot transact."),
            .init(id: "p-c-elasticity-1", conceptId: "c-elasticity", question: "Why does demand become more elastic when close substitutes are available?", modelAnswer: "Buyers can switch more easily when price rises, so quantity demanded falls by more."),
            .init(id: "p-c-elasticity-2", conceptId: "c-elasticity", question: "If demand is inelastic, what happens to revenue when price increases?", modelAnswer: "Revenue rises because the percentage drop in quantity is smaller than the percentage rise in price."),
            .init(id: "p-c-choice-1", conceptId: "c-choice", question: "What does a budget constraint represent?", modelAnswer: "The combinations of goods a consumer can afford given prices and income."),
            .init(id: "p-c-choice-2", conceptId: "c-choice", question: "At an interior optimum, what is equalized?", modelAnswer: "The marginal utility per dollar (or MRS) equals the price ratio."),
            .init(id: "p-c-markets-1", conceptId: "c-markets", question: "How does perfect competition differ from monopoly in the long run?", modelAnswer: "Competition drives economic profit toward zero; a monopoly can sustain profit with barriers to entry."),
            .init(id: "p-c-markets-2", conceptId: "c-markets", question: "What is the core inefficiency of monopoly pricing?", modelAnswer: "Price above marginal cost, so some mutually beneficial trades do not occur."),
            .init(id: "p-c-fiscal-1", conceptId: "c-fiscal", question: "How can a government spending increase affect aggregate demand?", modelAnswer: "It raises AD directly, and may multiply if households spend the extra income."),
            .init(id: "p-c-fiscal-2", conceptId: "c-fiscal", question: "What is crowding out in a simple closed economy?", modelAnswer: "Higher public borrowing can raise interest rates and reduce private investment."),
            .init(id: "p-c-monetary-1", conceptId: "c-monetary", question: "How does a rate cut typically stimulate spending?", modelAnswer: "Cheaper borrowing and higher asset prices encourage consumption and investment."),
            .init(id: "p-c-monetary-2", conceptId: "c-monetary", question: "Why might monetary policy be weaker at the zero lower bound?", modelAnswer: "Nominal rates cannot fall further, so conventional cuts lose traction."),
            .init(id: "p-c-game-1", conceptId: "c-game", question: "What is a Nash equilibrium?", modelAnswer: "A profile of strategies where no player can gain by unilaterally changing their own strategy."),
            .init(id: "p-c-game-2", conceptId: "c-game", question: "In a prisoner’s dilemma, why is the dominant-strategy outcome inefficient?", modelAnswer: "Each defects to protect themselves, so both do worse than if they could commit to cooperate."),
        ]

        return LearnerSnapshot(
            profile: profile,
            course: course,
            exam: exam,
            concepts: concepts,
            relationships: relationships,
            prompts: prompts,
            events: events
        )
    }
}
