import Foundation

public enum StudyScheduler {
    public static func daysUntilExam(_ exam: Exam, now: Date) -> Int {
        let seconds = exam.date.timeIntervalSince(now)
        if seconds <= 0 { return 0 }
        return Int(ceil(seconds / LearnerConstants.secondsPerDay))
    }

    public static func examUrgency(_ exam: Exam, now: Date) -> Double {
        1 / (1 + Double(daysUntilExam(exam, now: now)) / LearnerConstants.priorityUrgencyDivisor)
    }

    public static func readiness(concepts: [Concept]) -> Double {
        guard !concepts.isEmpty else { return 0 }
        let weight = concepts.reduce(0.0) { $0 + $1.importance }
        guard weight > 0 else { return 0 }
        return concepts.reduce(0.0) { $0 + $1.mastery * $1.importance } / weight
    }

    public static func estimatedMinutesToImprove(difficulty: Double, mastery: Double) -> Int {
        let weakness = 1 - LearnerModel.clamp01(mastery)
        let raw = 8 + LearnerModel.clamp01(difficulty) * 16 * (0.5 + weakness)
        return Int(raw.rounded())
            .clamped(to: LearnerConstants.minBlockMinutes...LearnerConstants.maxBlockMinutes)
    }

    public static func prerequisiteImpact(
        concept: Concept,
        status: ConceptStatus,
        relationships: [ConceptRelationship],
        concepts: [Concept]
    ) -> Double {
        let dependents = relationships.filter { $0.kind == .prerequisite && $0.fromId == concept.id }
        var impact = 1.0
        if !dependents.isEmpty && (status == .weak || status == .notLearned) {
            impact *= LearnerConstants.prereqBoost
        }
        let prereqs = relationships
            .filter { $0.kind == .prerequisite && $0.toId == concept.id }
            .compactMap { rel in concepts.first { $0.id == rel.fromId } }
        if prereqs.contains(where: { $0.mastery < LearnerConstants.unmetPrereqMastery }) {
            impact *= LearnerConstants.unmetPrereqCut
        }
        return impact
    }

    /// study_value = importance × weakness × forgetting_risk × prerequisite_impact × urgency ÷ minutes
    public static func studyValue(
        concept: Concept,
        exam: Exam,
        relationships: [ConceptRelationship],
        concepts: [Concept],
        now: Date
    ) -> Double {
        let status = LearnerModel.deriveStatus(
            mastery: concept.mastery,
            retention: concept.predictedRetention,
            retrievalAttempts: concept.retrievalAttempts
        )
        let weakness = max(0.05, 1 - concept.mastery)
        let forgettingRisk = concept.lastReviewedAt == nil
            ? 0.85
            : max(0.08, 1 - concept.predictedRetention)
        let minutes = Double(estimatedMinutesToImprove(difficulty: concept.difficulty, mastery: concept.mastery))
        let impact = prerequisiteImpact(
            concept: concept,
            status: status,
            relationships: relationships,
            concepts: concepts
        )
        return concept.importance
            * weakness
            * forgettingRisk
            * impact
            * examUrgency(exam, now: now)
            / max(minutes, 1)
    }

    public static func rankConcepts(
        _ concepts: [Concept],
        exam: Exam,
        relationships: [ConceptRelationship],
        now: Date
    ) -> [RankedConcept] {
        concepts
            .map { concept in
                let status = LearnerModel.deriveStatus(
                    mastery: concept.mastery,
                    retention: concept.predictedRetention,
                    retrievalAttempts: concept.retrievalAttempts
                )
                return RankedConcept(
                    concept: concept,
                    status: status,
                    studyValue: studyValue(
                        concept: concept,
                        exam: exam,
                        relationships: relationships,
                        concepts: concepts,
                        now: now
                    ),
                    estimatedMinutes: estimatedMinutesToImprove(
                        difficulty: concept.difficulty,
                        mastery: concept.mastery
                    )
                )
            }
            .sorted {
                if $0.studyValue != $1.studyValue { return $0.studyValue > $1.studyValue }
                return $0.concept.name < $1.concept.name
            }
    }

    public static func reason(for row: RankedConcept, relationships: [ConceptRelationship]) -> String {
        let isPrereq = relationships.contains { $0.kind == .prerequisite && $0.fromId == row.concept.id }
        if isPrereq && (row.status == .weak || row.status == .fading || row.status == .notLearned) {
            return "Important prerequisite · \(row.status.displayName)"
        }
        if row.concept.importance >= 0.8 && row.concept.mastery < 0.55 {
            return "High exam importance · Low mastery"
        }
        if row.concept.importance >= 0.7 {
            return "High exam relevance"
        }
        if row.status == .fading {
            return "Fading · review before it slips"
        }
        if row.status == .notLearned {
            return "Not learned · high leverage if the exam asks"
        }
        return "Best remaining return for the time"
    }

    public static func planStudyBlock(
        concepts: [Concept],
        exam: Exam,
        relationships: [ConceptRelationship],
        availableMinutes: Int,
        now: Date
    ) -> StudyPlan {
        let ranked = rankConcepts(concepts, exam: exam, relationships: relationships, now: now)
        let budget = max(availableMinutes, LearnerConstants.minBlockMinutes)
        let reserveMixed = budget >= 30 ? LearnerConstants.mixedRetrievalMinutes : 0
        var remaining = budget - reserveMixed
        var blocks: [PlanBlock] = []

        for row in ranked {
            if remaining < LearnerConstants.minBlockMinutes { break }
            let minutes = min(row.estimatedMinutes, remaining, LearnerConstants.maxBlockMinutes)
            if minutes < LearnerConstants.minBlockMinutes { continue }
            remaining -= minutes
            blocks.append(
                PlanBlock(
                    id: "block-\(row.concept.id)",
                    kind: .concept,
                    conceptId: row.concept.id,
                    title: row.concept.name,
                    minutes: minutes,
                    reason: reason(for: row, relationships: relationships),
                    status: row.status
                )
            )
        }

        if remaining > 0, let last = blocks.indices.last {
            blocks[last].minutes += remaining
            remaining = 0
        }

        if reserveMixed > 0 {
            blocks.append(
                PlanBlock(
                    id: "block-mixed",
                    kind: .mixedRetrieval,
                    conceptId: nil,
                    title: "Mixed Retrieval",
                    minutes: reserveMixed,
                    reason: "Quick checks across today's topics",
                    status: nil
                )
            )
        }

        let planned = blocks.reduce(0) { $0 + $1.minutes }
        return StudyPlan(blocks: blocks, plannedMinutes: planned, ranked: ranked)
    }
}

private extension Int {
    func clamped(to range: ClosedRange<Int>) -> Int {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}
