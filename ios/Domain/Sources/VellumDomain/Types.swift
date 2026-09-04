import Foundation

public enum ConceptStatus: String, Sendable, Codable, CaseIterable {
    case strong
    case stable
    case fading
    case weak
    case notLearned = "not_learned"

    public var displayName: String {
        switch self {
        case .strong: "Strong"
        case .stable: "Stable"
        case .fading: "Fading"
        case .weak: "Weak"
        case .notLearned: "Not learned"
        }
    }
}

public enum RetrievalOutcome: String, Sendable, Codable {
    case success
    case partial
    case failure
}

public enum RelationshipKind: String, Sendable, Codable {
    case prerequisite
    case related
}

public enum LearningEventKind: String, Sendable, Codable {
    case seedRating = "seed_rating"
    case retrieval
}

public enum StudySessionStatus: String, Sendable, Codable {
    case planned
    case active
    case complete
}

public struct StudentProfile: Sendable, Equatable {
    public var id: String
    public var displayName: String

    public init(id: String, displayName: String) {
        self.id = id
        self.displayName = displayName
    }
}

public struct Course: Sendable, Equatable {
    public var id: String
    public var name: String
    public var typicalMinutes: Int

    public init(id: String, name: String, typicalMinutes: Int) {
        self.id = id
        self.name = name
        self.typicalMinutes = typicalMinutes
    }
}

public struct Exam: Sendable, Equatable {
    public var id: String
    public var courseId: String
    public var date: Date
    public var targetGrade: Double
    public var evidenceConfidence: Double

    public init(
        id: String,
        courseId: String,
        date: Date,
        targetGrade: Double,
        evidenceConfidence: Double = 0.4
    ) {
        self.id = id
        self.courseId = courseId
        self.date = date
        self.targetGrade = targetGrade
        self.evidenceConfidence = evidenceConfidence
    }
}

public struct Concept: Sendable, Equatable {
    public var id: String
    public var courseId: String
    public var name: String
    public var importance: Double
    public var difficulty: Double
    public var mastery: Double
    public var confidence: Double
    public var predictedRetention: Double
    public var lastReviewedAt: Date?
    public var nextReviewAt: Date?
    public var retrievalAttempts: Int
    public var successfulRetrievals: Int
    public var failedRetrievals: Int

    public init(
        id: String,
        courseId: String,
        name: String,
        importance: Double,
        difficulty: Double,
        mastery: Double = 0,
        confidence: Double = 0,
        predictedRetention: Double = 0,
        lastReviewedAt: Date? = nil,
        nextReviewAt: Date? = nil,
        retrievalAttempts: Int = 0,
        successfulRetrievals: Int = 0,
        failedRetrievals: Int = 0
    ) {
        self.id = id
        self.courseId = courseId
        self.name = name
        self.importance = importance
        self.difficulty = difficulty
        self.mastery = mastery
        self.confidence = confidence
        self.predictedRetention = predictedRetention
        self.lastReviewedAt = lastReviewedAt
        self.nextReviewAt = nextReviewAt
        self.retrievalAttempts = retrievalAttempts
        self.successfulRetrievals = successfulRetrievals
        self.failedRetrievals = failedRetrievals
    }
}

public struct ConceptRelationship: Sendable, Equatable {
    public var id: String
    public var fromId: String
    public var toId: String
    public var kind: RelationshipKind

    public init(id: String, fromId: String, toId: String, kind: RelationshipKind) {
        self.id = id
        self.fromId = fromId
        self.toId = toId
        self.kind = kind
    }
}

public struct RetrievalPrompt: Sendable, Equatable {
    public var id: String
    public var conceptId: String
    public var question: String
    public var modelAnswer: String

    public init(id: String, conceptId: String, question: String, modelAnswer: String) {
        self.id = id
        self.conceptId = conceptId
        self.question = question
        self.modelAnswer = modelAnswer
    }
}

public struct LearningEvent: Sendable, Equatable {
    public var id: String
    public var conceptId: String
    public var sessionId: String?
    public var kind: LearningEventKind
    public var outcome: RetrievalOutcome
    public var promptId: String?
    public var responseText: String?
    public var masteryBefore: Double
    public var masteryAfter: Double
    public var createdAt: Date

    public init(
        id: String,
        conceptId: String,
        sessionId: String?,
        kind: LearningEventKind,
        outcome: RetrievalOutcome,
        promptId: String?,
        responseText: String?,
        masteryBefore: Double,
        masteryAfter: Double,
        createdAt: Date
    ) {
        self.id = id
        self.conceptId = conceptId
        self.sessionId = sessionId
        self.kind = kind
        self.outcome = outcome
        self.promptId = promptId
        self.responseText = responseText
        self.masteryBefore = masteryBefore
        self.masteryAfter = masteryAfter
        self.createdAt = createdAt
    }
}

public struct ConceptCache: Sendable, Equatable {
    public var mastery: Double
    public var confidence: Double
    public var predictedRetention: Double
    public var lastReviewedAt: Date?
    public var nextReviewAt: Date?
    public var retrievalAttempts: Int
    public var successfulRetrievals: Int
    public var failedRetrievals: Int

    public init(
        mastery: Double,
        confidence: Double,
        predictedRetention: Double,
        lastReviewedAt: Date?,
        nextReviewAt: Date?,
        retrievalAttempts: Int,
        successfulRetrievals: Int,
        failedRetrievals: Int
    ) {
        self.mastery = mastery
        self.confidence = confidence
        self.predictedRetention = predictedRetention
        self.lastReviewedAt = lastReviewedAt
        self.nextReviewAt = nextReviewAt
        self.retrievalAttempts = retrievalAttempts
        self.successfulRetrievals = successfulRetrievals
        self.failedRetrievals = failedRetrievals
    }
}

public struct RankedConcept: Sendable, Equatable {
    public var concept: Concept
    public var status: ConceptStatus
    public var studyValue: Double
    public var estimatedMinutes: Int

    public init(concept: Concept, status: ConceptStatus, studyValue: Double, estimatedMinutes: Int) {
        self.concept = concept
        self.status = status
        self.studyValue = studyValue
        self.estimatedMinutes = estimatedMinutes
    }
}

public enum PlanBlockKind: String, Sendable, Codable {
    case concept
    case mixedRetrieval
}

public struct PlanBlock: Sendable, Equatable, Identifiable {
    public var id: String
    public var kind: PlanBlockKind
    public var conceptId: String?
    public var title: String
    public var minutes: Int
    public var reason: String
    public var status: ConceptStatus?

    public init(
        id: String,
        kind: PlanBlockKind,
        conceptId: String?,
        title: String,
        minutes: Int,
        reason: String,
        status: ConceptStatus?
    ) {
        self.id = id
        self.kind = kind
        self.conceptId = conceptId
        self.title = title
        self.minutes = minutes
        self.reason = reason
        self.status = status
    }
}

public struct StudyPlan: Sendable, Equatable {
    public var blocks: [PlanBlock]
    public var plannedMinutes: Int
    public var ranked: [RankedConcept]

    public init(blocks: [PlanBlock], plannedMinutes: Int, ranked: [RankedConcept]) {
        self.blocks = blocks
        self.plannedMinutes = plannedMinutes
        self.ranked = ranked
    }
}

public struct SessionItem: Sendable, Equatable, Identifiable {
    public var id: String
    public var conceptId: String
    public var conceptName: String
    public var promptId: String
    public var question: String
    public var modelAnswer: String

    public init(
        id: String,
        conceptId: String,
        conceptName: String,
        promptId: String,
        question: String,
        modelAnswer: String
    ) {
        self.id = id
        self.conceptId = conceptId
        self.conceptName = conceptName
        self.promptId = promptId
        self.question = question
        self.modelAnswer = modelAnswer
    }
}

public struct MasteryDelta: Sendable, Equatable {
    public var conceptId: String
    public var name: String
    public var before: Double
    public var after: Double

    public init(conceptId: String, name: String, before: Double, after: Double) {
        self.conceptId = conceptId
        self.name = name
        self.before = before
        self.after = after
    }
}

public struct SessionSummary: Sendable, Equatable {
    public var plannedMinutes: Int
    public var readinessBefore: Double
    public var readinessAfter: Double
    public var conceptDeltas: [MasteryDelta]
    public var tomorrowNames: [String]

    public init(
        plannedMinutes: Int,
        readinessBefore: Double,
        readinessAfter: Double,
        conceptDeltas: [MasteryDelta],
        tomorrowNames: [String]
    ) {
        self.plannedMinutes = plannedMinutes
        self.readinessBefore = readinessBefore
        self.readinessAfter = readinessAfter
        self.conceptDeltas = conceptDeltas
        self.tomorrowNames = tomorrowNames
    }
}

public struct LearnerSnapshot: Sendable, Equatable {
    public var profile: StudentProfile
    public var course: Course
    public var exam: Exam
    public var concepts: [Concept]
    public var relationships: [ConceptRelationship]
    public var prompts: [RetrievalPrompt]
    public var events: [LearningEvent]

    public init(
        profile: StudentProfile,
        course: Course,
        exam: Exam,
        concepts: [Concept],
        relationships: [ConceptRelationship],
        prompts: [RetrievalPrompt],
        events: [LearningEvent]
    ) {
        self.profile = profile
        self.course = course
        self.exam = exam
        self.concepts = concepts
        self.relationships = relationships
        self.prompts = prompts
        self.events = events
    }
}

public enum Format {
    public static func percent(_ value: Double) -> Int {
        Int((clamp01(value) * 100).rounded())
    }

    public static func clamp01(_ value: Double) -> Double {
        LearnerModel.clamp01(value)
    }
}
