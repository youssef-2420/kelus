import Foundation

public enum LearnerModel {
    public static func clamp01(_ value: Double) -> Double {
        guard value.isFinite else { return 0 }
        return min(1, max(0, value))
    }

    public static func daysBetween(_ from: Date, _ to: Date) -> Double {
        max(0, to.timeIntervalSince(from) / LearnerConstants.secondsPerDay)
    }

    public static func stabilityDays(mastery: Double, successfulRetrievals: Int) -> Double {
        LearnerConstants.stabilityBaseDays
            + LearnerConstants.stabilityMasteryWeight
            * clamp01(mastery)
            * log(1 + Double(max(0, successfulRetrievals)))
    }

    public static func applyRetrievalMastery(
        mastery: Double,
        outcome: RetrievalOutcome,
        difficulty: Double,
        successfulRetrievals: Int
    ) -> Double {
        let current = clamp01(mastery)
        if outcome == .failure {
            return clamp01(current * LearnerConstants.masteryFailMultiplier)
        }
        let growth = LearnerConstants.masterySuccessGrowth
            * (1 - LearnerConstants.masteryDifficultyWeight * clamp01(difficulty))
            / (1 + LearnerConstants.masteryRepeatDamping * Double(max(0, successfulRetrievals)))
        let scaled = outcome == .partial ? growth * LearnerConstants.masteryPartialFactor : growth
        return clamp01(current + (1 - current) * scaled)
    }

    public static func confidenceFromOutcomes(_ outcomes: [RetrievalOutcome]) -> Double {
        let recent = Array(outcomes.suffix(LearnerConstants.confidenceWindow))
        guard !recent.isEmpty else { return 0 }
        let score = recent.reduce(0.0) { total, outcome in
            switch outcome {
            case .success: total + 1
            case .partial: total + 0.5
            case .failure: total
            }
        }
        return clamp01(score / Double(recent.count))
    }

    public static func deriveStatus(
        mastery: Double,
        retention: Double,
        retrievalAttempts: Int
    ) -> ConceptStatus {
        if retrievalAttempts <= 0 && mastery <= 0 { return .notLearned }
        if mastery < LearnerConstants.statusWeakMastery || retention < LearnerConstants.statusWeakRetention {
            return .weak
        }
        if mastery >= LearnerConstants.statusStrongMastery
            && retention >= LearnerConstants.statusStrongRetention
        {
            return .strong
        }
        if mastery >= LearnerConstants.statusFadingMastery
            && retention <= mastery - LearnerConstants.statusFadingGap
        {
            return .fading
        }
        return .stable
    }

    public static func recomputeConceptCache(
        conceptId: String,
        difficulty: Double,
        events: [LearningEvent],
        now: Date
    ) -> ConceptCache {
        let history = events
            .filter { $0.conceptId == conceptId }
            .sorted {
                if $0.createdAt != $1.createdAt { return $0.createdAt < $1.createdAt }
                return $0.id < $1.id
            }

        var mastery = 0.0
        var retrievalAttempts = 0
        var successfulRetrievals = 0
        var failedRetrievals = 0
        var lastReviewedAt: Date?
        var lastSuccessAt: Date?
        var retrievalOutcomes: [RetrievalOutcome] = []

        for event in history {
            if event.kind == .seedRating {
                mastery = event.masteryAfter
                lastReviewedAt = event.createdAt
                if event.outcome == .success || event.outcome == .partial {
                    lastSuccessAt = event.createdAt
                    successfulRetrievals = 1
                }
                continue
            }
            mastery = applyRetrievalMastery(
                mastery: mastery,
                outcome: event.outcome,
                difficulty: difficulty,
                successfulRetrievals: successfulRetrievals
            )
            retrievalAttempts += 1
            lastReviewedAt = event.createdAt
            retrievalOutcomes.append(event.outcome)
            if event.outcome == .failure {
                failedRetrievals += 1
            } else {
                successfulRetrievals += 1
                lastSuccessAt = event.createdAt
            }
        }

        let retention = RetentionEngine.predictedRetention(
            mastery: mastery,
            successfulRetrievals: successfulRetrievals,
            lastSuccessAt: lastSuccessAt,
            now: now
        )
        return ConceptCache(
            mastery: mastery,
            confidence: confidenceFromOutcomes(retrievalOutcomes),
            predictedRetention: retention,
            lastReviewedAt: lastReviewedAt,
            nextReviewAt: RetentionEngine.nextReviewAt(
                mastery: mastery,
                successfulRetrievals: successfulRetrievals,
                lastSuccessAt: lastSuccessAt,
                now: now
            ),
            retrievalAttempts: retrievalAttempts,
            successfulRetrievals: successfulRetrievals,
            failedRetrievals: failedRetrievals
        )
    }

    public static func applying(_ cache: ConceptCache, to concept: Concept) -> Concept {
        var next = concept
        next.mastery = cache.mastery
        next.confidence = cache.confidence
        next.predictedRetention = cache.predictedRetention
        next.lastReviewedAt = cache.lastReviewedAt
        next.nextReviewAt = cache.nextReviewAt
        next.retrievalAttempts = cache.retrievalAttempts
        next.successfulRetrievals = cache.successfulRetrievals
        next.failedRetrievals = cache.failedRetrievals
        return next
    }

    public static func refreshConcepts(_ concepts: [Concept], events: [LearningEvent], now: Date) -> [Concept] {
        concepts.map { concept in
            applying(
                recomputeConceptCache(
                    conceptId: concept.id,
                    difficulty: concept.difficulty,
                    events: events,
                    now: now
                ),
                to: concept
            )
        }
    }
}
