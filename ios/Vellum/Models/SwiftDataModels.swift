import Foundation
import SwiftData

@Model
final class ProfileRecord {
    @Attribute(.unique) var id: String
    var displayName: String
    var simulatedNow: Date
    var seeded: Bool

    init(id: String, displayName: String, simulatedNow: Date, seeded: Bool = true) {
        self.id = id
        self.displayName = displayName
        self.simulatedNow = simulatedNow
        self.seeded = seeded
    }
}

@Model
final class CourseRecord {
    @Attribute(.unique) var id: String
    var name: String
    var typicalMinutes: Int

    @Relationship(deleteRule: .cascade, inverse: \ExamRecord.course)
    var exams: [ExamRecord] = []

    @Relationship(deleteRule: .cascade, inverse: \ConceptRecord.course)
    var concepts: [ConceptRecord] = []

    init(id: String, name: String, typicalMinutes: Int) {
        self.id = id
        self.name = name
        self.typicalMinutes = typicalMinutes
    }
}

@Model
final class ExamRecord {
    @Attribute(.unique) var id: String
    var date: Date
    var targetGrade: Double
    var evidenceConfidence: Double
    var course: CourseRecord?

    init(id: String, date: Date, targetGrade: Double, evidenceConfidence: Double) {
        self.id = id
        self.date = date
        self.targetGrade = targetGrade
        self.evidenceConfidence = evidenceConfidence
    }
}

@Model
final class ConceptRecord {
    @Attribute(.unique) var id: String
    var name: String
    var importance: Double
    var difficulty: Double
    var mastery: Double
    var confidence: Double
    var predictedRetention: Double
    var lastReviewedAt: Date?
    var nextReviewAt: Date?
    var retrievalAttempts: Int
    var successfulRetrievals: Int
    var failedRetrievals: Int
    var course: CourseRecord?

    @Relationship(deleteRule: .cascade, inverse: \PromptRecord.concept)
    var prompts: [PromptRecord] = []

    init(
        id: String,
        name: String,
        importance: Double,
        difficulty: Double,
        mastery: Double,
        confidence: Double,
        predictedRetention: Double,
        lastReviewedAt: Date?,
        nextReviewAt: Date?,
        retrievalAttempts: Int,
        successfulRetrievals: Int,
        failedRetrievals: Int
    ) {
        self.id = id
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

@Model
final class RelationshipRecord {
    @Attribute(.unique) var id: String
    var fromId: String
    var toId: String
    var kind: String

    init(id: String, fromId: String, toId: String, kind: String) {
        self.id = id
        self.fromId = fromId
        self.toId = toId
        self.kind = kind
    }
}

@Model
final class PromptRecord {
    @Attribute(.unique) var id: String
    var question: String
    var modelAnswer: String
    var concept: ConceptRecord?

    init(id: String, question: String, modelAnswer: String) {
        self.id = id
        self.question = question
        self.modelAnswer = modelAnswer
    }
}

@Model
final class SessionRecord {
    @Attribute(.unique) var id: String
    var startedAt: Date
    var endedAt: Date?
    var plannedMinutes: Int
    var completedMinutes: Int
    var status: String

    init(id: String, startedAt: Date, plannedMinutes: Int, completedMinutes: Int, status: String) {
        self.id = id
        self.startedAt = startedAt
        self.plannedMinutes = plannedMinutes
        self.completedMinutes = completedMinutes
        self.status = status
    }
}

@Model
final class LearningEventRecord {
    @Attribute(.unique) var id: String
    var conceptId: String
    var sessionId: String?
    var kind: String
    var outcome: String
    var promptId: String?
    var responseText: String?
    var masteryBefore: Double
    var masteryAfter: Double
    var createdAt: Date

    init(
        id: String,
        conceptId: String,
        sessionId: String?,
        kind: String,
        outcome: String,
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
