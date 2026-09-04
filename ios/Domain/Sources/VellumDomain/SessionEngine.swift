import Foundation

public enum SessionEngine {
    public static func createRetrievalEvent(
        id: String,
        concept: Concept,
        sessionId: String,
        promptId: String,
        responseText: String,
        outcome: RetrievalOutcome,
        createdAt: Date
    ) -> LearningEvent {
        let masteryAfter = LearnerModel.applyRetrievalMastery(
            mastery: concept.mastery,
            outcome: outcome,
            difficulty: concept.difficulty,
            successfulRetrievals: concept.successfulRetrievals
        )
        return LearningEvent(
            id: id,
            conceptId: concept.id,
            sessionId: sessionId,
            kind: .retrieval,
            outcome: outcome,
            promptId: promptId,
            responseText: responseText,
            masteryBefore: concept.mastery,
            masteryAfter: masteryAfter,
            createdAt: createdAt
        )
    }

    public static func buildQueue(
        plan: StudyPlan,
        concepts: [Concept],
        prompts: [RetrievalPrompt],
        questionCount: Int = 6
    ) -> [SessionItem] {
        let conceptBlocks = plan.blocks.filter { $0.kind == .concept }
        var items: [SessionItem] = []
        var promptCursor: [String: Int] = [:]
        var index = 0

        func nextPrompt(for conceptId: String) -> RetrievalPrompt? {
            let matches = prompts.filter { $0.conceptId == conceptId }
            guard !matches.isEmpty else { return nil }
            let cursor = promptCursor[conceptId, default: 0]
            promptCursor[conceptId] = cursor + 1
            return matches[cursor % matches.count]
        }

        while items.count < questionCount, !conceptBlocks.isEmpty {
            let block = conceptBlocks[index % conceptBlocks.count]
            index += 1
            guard let conceptId = block.conceptId,
                  let concept = concepts.first(where: { $0.id == conceptId }),
                  let prompt = nextPrompt(for: conceptId)
            else { continue }
            items.append(
                SessionItem(
                    id: "q-\(items.count + 1)-\(prompt.id)",
                    conceptId: concept.id,
                    conceptName: concept.name,
                    promptId: prompt.id,
                    question: prompt.question,
                    modelAnswer: prompt.modelAnswer
                )
            )
            if items.count > 40 { break }
        }
        return items
    }

    public static func summarize(
        plannedMinutes: Int,
        before: [Concept],
        after: [Concept],
        exam: Exam,
        relationships: [ConceptRelationship],
        now: Date
    ) -> SessionSummary {
        let beforeById = Dictionary(uniqueKeysWithValues: before.map { ($0.id, $0) })
        let deltas = after.compactMap { concept -> MasteryDelta? in
            guard let previous = beforeById[concept.id] else { return nil }
            guard abs(concept.mastery - previous.mastery) >= 0.005 else { return nil }
            return MasteryDelta(
                conceptId: concept.id,
                name: concept.name,
                before: previous.mastery,
                after: concept.mastery
            )
        }
        .sorted { abs($0.after - $0.before) > abs($1.after - $1.before) }

        let tomorrow = StudyScheduler.planStudyBlock(
            concepts: after,
            exam: exam,
            relationships: relationships,
            availableMinutes: plannedMinutes,
            now: now.addingTimeInterval(LearnerConstants.secondsPerDay)
        )
        .blocks
        .filter { $0.kind == .concept }
        .prefix(3)
        .map(\.title)

        return SessionSummary(
            plannedMinutes: plannedMinutes,
            readinessBefore: StudyScheduler.readiness(concepts: before),
            readinessAfter: StudyScheduler.readiness(concepts: after),
            conceptDeltas: deltas,
            tomorrowNames: Array(tomorrow)
        )
    }
}
