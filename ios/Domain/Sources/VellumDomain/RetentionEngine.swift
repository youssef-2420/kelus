import Foundation

public enum RetentionEngine {
    public static func predictedRetention(
        mastery: Double,
        successfulRetrievals: Int,
        lastSuccessAt: Date?,
        now: Date
    ) -> Double {
        guard let lastSuccessAt else { return 0 }
        let stability = LearnerModel.stabilityDays(
            mastery: mastery,
            successfulRetrievals: successfulRetrievals
        )
        let elapsed = LearnerModel.daysBetween(lastSuccessAt, now)
        return LearnerModel.clamp01(mastery * pow(2, -elapsed / max(stability, 0.01)))
    }

    public static func nextReviewAt(
        mastery: Double,
        successfulRetrievals: Int,
        lastSuccessAt: Date?,
        now: Date
    ) -> Date {
        guard lastSuccessAt != nil else { return now }
        let days = LearnerModel.stabilityDays(mastery: mastery, successfulRetrievals: successfulRetrievals)
            * LearnerConstants.nextReviewStabilityFraction
        return now.addingTimeInterval(days * LearnerConstants.secondsPerDay)
    }
}

/// Simulated calendar advance. Compiled out of production via `DEBUG`.
public enum DemoClock {
    public static var isEnabled: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }

    public static func advance(now: Date, days: Int) -> Date {
        precondition(isEnabled, "Demo clock is not available in production builds")
        return now.addingTimeInterval(Double(days) * LearnerConstants.secondsPerDay)
    }
}
