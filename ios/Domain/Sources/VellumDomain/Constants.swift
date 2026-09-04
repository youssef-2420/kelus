import Foundation

/// Replaceable MVP heuristic constants.
/// Kind is named so we never pretend this predicts grades.
public enum LearnerConstants {
    public static let algorithmKind = "vellum-mvp-heuristic-v1"

    public static let masterySuccessGrowth = 0.18
    public static let masteryPartialFactor = 0.45
    public static let masteryFailMultiplier = 0.65
    public static let masteryDifficultyWeight = 0.4
    public static let masteryRepeatDamping = 0.12

    public static let stabilityBaseDays = 2.0
    public static let stabilityMasteryWeight = 8.0
    public static let nextReviewStabilityFraction = 0.5

    public static let priorityUrgencyDivisor = 7.0
    public static let prereqBoost = 1.5
    public static let unmetPrereqCut = 0.25
    public static let unmetPrereqMastery = 0.45

    public static let statusWeakMastery = 0.4
    public static let statusWeakRetention = 0.45
    public static let statusFadingMastery = 0.55
    public static let statusFadingGap = 0.18
    public static let statusStrongMastery = 0.8
    public static let statusStrongRetention = 0.75

    public static let confidenceWindow = 8
    public static let mixedRetrievalMinutes = 5
    public static let minBlockMinutes = 8
    public static let maxBlockMinutes = 20
    public static let defaultSessionMinutes = 45

    public static let secondsPerDay: TimeInterval = 86_400
}
