import Foundation
import SwiftData
import VellumDomain

enum RecordMapping {
    static func course(_ record: CourseRecord) -> Course {
        Course(id: record.id, name: record.name, typicalMinutes: record.typicalMinutes)
    }

    static func exam(_ record: ExamRecord, courseId: String) -> Exam {
        Exam(
            id: record.id,
            courseId: courseId,
            date: record.date,
            targetGrade: record.targetGrade,
            evidenceConfidence: record.evidenceConfidence
        )
    }

    static func concept(_ record: ConceptRecord, courseId: String) -> Concept {
        Concept(
            id: record.id,
            courseId: courseId,
            name: record.name,
            importance: record.importance,
            difficulty: record.difficulty,
            mastery: record.mastery,
            confidence: record.confidence,
            predictedRetention: record.predictedRetention,
            lastReviewedAt: record.lastReviewedAt,
            nextReviewAt: record.nextReviewAt,
            retrievalAttempts: record.retrievalAttempts,
            successfulRetrievals: record.successfulRetrievals,
            failedRetrievals: record.failedRetrievals
        )
    }

    static func apply(_ cache: ConceptCache, to record: ConceptRecord) {
        record.mastery = cache.mastery
        record.confidence = cache.confidence
        record.predictedRetention = cache.predictedRetention
        record.lastReviewedAt = cache.lastReviewedAt
        record.nextReviewAt = cache.nextReviewAt
        record.retrievalAttempts = cache.retrievalAttempts
        record.successfulRetrievals = cache.successfulRetrievals
        record.failedRetrievals = cache.failedRetrievals
    }

    static func event(_ record: LearningEventRecord) -> LearningEvent {
        LearningEvent(
            id: record.id,
            conceptId: record.conceptId,
            sessionId: record.sessionId,
            kind: LearningEventKind(rawValue: record.kind) ?? .retrieval,
            outcome: RetrievalOutcome(rawValue: record.outcome) ?? .partial,
            promptId: record.promptId,
            responseText: record.responseText,
            masteryBefore: record.masteryBefore,
            masteryAfter: record.masteryAfter,
            createdAt: record.createdAt
        )
    }

    static func relationship(_ record: RelationshipRecord) -> ConceptRelationship {
        ConceptRelationship(
            id: record.id,
            fromId: record.fromId,
            toId: record.toId,
            kind: RelationshipKind(rawValue: record.kind) ?? .related
        )
    }

    static func prompt(_ record: PromptRecord) -> RetrievalPrompt? {
        guard let conceptId = record.concept?.id else { return nil }
        return RetrievalPrompt(
            id: record.id,
            conceptId: conceptId,
            question: record.question,
            modelAnswer: record.modelAnswer
        )
    }
}
