import Foundation
import Observation
import SwiftData
import VellumDomain

@MainActor
@Observable
final class VellumStore {
    var now: Date
    var greetingName: String
    var courseName: String
    var typicalMinutes: Int
    var exam: Exam?
    var concepts: [Concept]
    var relationships: [ConceptRelationship]
    var prompts: [RetrievalPrompt]
    var plan: StudyPlan
    var sessionItems: [SessionItem]
    var activeSessionID: String?
    var lastSummary: SessionSummary?
    var showingSession = false
    var showingComplete = false
    var showingSetup = false

    private var context: ModelContext
    private var sessionStartConcepts: [Concept] = []

    init(context: ModelContext) {
        self.context = context
        self.now = Date()
        self.greetingName = "there"
        self.courseName = ""
        self.typicalMinutes = LearnerConstants.defaultSessionMinutes
        self.concepts = []
        self.relationships = []
        self.prompts = []
        self.plan = StudyPlan(blocks: [], plannedMinutes: 0, ranked: [])
        self.sessionItems = []
        bootstrapIfNeeded()
        refresh()
    }

    var daysRemaining: Int {
        guard let exam else { return 0 }
        return StudyScheduler.daysUntilExam(exam, now: now)
    }

    var readiness: Double {
        StudyScheduler.readiness(concepts: concepts)
    }

    var readinessLabel: String {
        if readiness >= 0.75 { return "PREPARED" }
        if readiness >= 0.55 { return "READY" }
        return "BUILDING"
    }

    func refresh() {
        let profiles = (try? context.fetch(FetchDescriptor<ProfileRecord>())) ?? []
        if let profile = profiles.first {
            now = profile.simulatedNow
            greetingName = profile.displayName
        }
        let courses = (try? context.fetch(FetchDescriptor<CourseRecord>())) ?? []
        guard let course = courses.first else {
            courseName = ""
            concepts = []
            plan = StudyPlan(blocks: [], plannedMinutes: 0, ranked: [])
            return
        }
        courseName = course.name
        typicalMinutes = course.typicalMinutes
        exam = course.exams.first.map { RecordMapping.exam($0, courseId: course.id) }
        concepts = course.concepts
            .map { RecordMapping.concept($0, courseId: course.id) }
            .sorted { $0.name < $1.name }
        relationships = ((try? context.fetch(FetchDescriptor<RelationshipRecord>())) ?? [])
            .map(RecordMapping.relationship)
        prompts = ((try? context.fetch(FetchDescriptor<PromptRecord>())) ?? [])
            .compactMap(RecordMapping.prompt)
        if let exam {
            plan = StudyScheduler.planStudyBlock(
                concepts: concepts,
                exam: exam,
                relationships: relationships,
                availableMinutes: typicalMinutes,
                now: now
            )
        }
    }

    func startSession() {
        guard exam != nil else { return }
        let sessionId = "session-\(UUID().uuidString)"
        activeSessionID = sessionId
        sessionStartConcepts = concepts
        sessionItems = SessionEngine.buildQueue(plan: plan, concepts: concepts, prompts: prompts)
        let record = SessionRecord(
            id: sessionId,
            startedAt: now,
            plannedMinutes: plan.plannedMinutes,
            completedMinutes: 0,
            status: StudySessionStatus.active.rawValue
        )
        context.insert(record)
        try? context.save()
        lastSummary = nil
        showingComplete = false
        showingSession = true
    }

    func applyRating(item: SessionItem, outcome: RetrievalOutcome, response: String) -> (before: Double, after: Double)? {
        guard let concept = concepts.first(where: { $0.id == item.conceptId }) else { return nil }
        let event = SessionEngine.createRetrievalEvent(
            id: "evt-\(UUID().uuidString)",
            concept: concept,
            sessionId: activeSessionID ?? "session",
            promptId: item.promptId,
            responseText: response,
            outcome: outcome,
            createdAt: now
        )
        context.insert(
            LearningEventRecord(
                id: event.id,
                conceptId: event.conceptId,
                sessionId: event.sessionId,
                kind: event.kind.rawValue,
                outcome: event.outcome.rawValue,
                promptId: event.promptId,
                responseText: event.responseText,
                masteryBefore: event.masteryBefore,
                masteryAfter: event.masteryAfter,
                createdAt: event.createdAt
            )
        )
        recomputeConcept(id: concept.id)
        try? context.save()
        refresh()
        let updated = concepts.first { $0.id == item.conceptId }
        return (event.masteryBefore, updated?.mastery ?? event.masteryAfter)
    }

    func completeSession() {
        guard showingSession else { return }
        let events = ((try? context.fetch(FetchDescriptor<LearningEventRecord>())) ?? []).map(RecordMapping.event)
        let after = LearnerModel.refreshConcepts(concepts, events: events, now: now)
        if let exam {
            lastSummary = SessionEngine.summarize(
                plannedMinutes: plan.plannedMinutes,
                before: sessionStartConcepts,
                after: after,
                exam: exam,
                relationships: relationships,
                now: now
            )
        }
        if let sessionId = activeSessionID {
            let matchId = sessionId
            let descriptor = FetchDescriptor<SessionRecord>(predicate: #Predicate { $0.id == matchId })
            if let session = try? context.fetch(descriptor).first {
                session.status = StudySessionStatus.complete.rawValue
                session.endedAt = now
                session.completedMinutes = plan.plannedMinutes
            }
        }
        try? context.save()
        showingSession = false
        showingComplete = true
        refresh()
    }

    func dismissComplete() {
        showingComplete = false
        activeSessionID = nil
        refresh()
    }

    func createExam(name: String, date: Date, targetPercent: Int, minutes: Int) {
        deleteAll()
        let course = CourseRecord(id: "course-\(UUID().uuidString)", name: name, typicalMinutes: minutes)
        let exam = ExamRecord(
            id: "exam-\(UUID().uuidString)",
            date: date,
            targetGrade: Double(targetPercent) / 100,
            evidenceConfidence: 0.3
        )
        exam.course = course
        context.insert(course)
        context.insert(exam)
        if let profile = try? context.fetch(FetchDescriptor<ProfileRecord>()).first {
            profile.displayName = "You"
        }
        try? context.save()
        refresh()
        showingSetup = false
    }

    func addConcept(name: String, rating: SeedRating) {
        guard let course = (try? context.fetch(FetchDescriptor<CourseRecord>()))?.first else { return }
        let id = "c-\(UUID().uuidString)"
        let mastery = rating.mastery
        let concept = ConceptRecord(
            id: id,
            name: name,
            importance: 0.7,
            difficulty: 0.45,
            mastery: 0,
            confidence: 0,
            predictedRetention: 0,
            lastReviewedAt: nil,
            nextReviewAt: nil,
            retrievalAttempts: 0,
            successfulRetrievals: 0,
            failedRetrievals: 0
        )
        concept.course = course
        context.insert(concept)
        let prompt = PromptRecord(
            id: "p-\(id)-1",
            question: "Explain \(name) in one sentence, as you would in an exam.",
            modelAnswer: "A precise definition plus why it matters for this course."
        )
        prompt.concept = concept
        context.insert(prompt)
        if mastery > 0 {
            context.insert(
                LearningEventRecord(
                    id: "evt-seed-\(id)",
                    conceptId: id,
                    sessionId: nil,
                    kind: LearningEventKind.seedRating.rawValue,
                    outcome: rating.outcome.rawValue,
                    promptId: nil,
                    responseText: nil,
                    masteryBefore: 0,
                    masteryAfter: mastery,
                    createdAt: now.addingTimeInterval(-7 * LearnerConstants.secondsPerDay)
                )
            )
        }
        recomputeConcept(id: id)
        try? context.save()
        refresh()
    }

    #if DEBUG
    func skipDay() {
        guard DemoClock.isEnabled else { return }
        now = DemoClock.advance(now: now, days: 1)
        if let profile = try? context.fetch(FetchDescriptor<ProfileRecord>()).first {
            profile.simulatedNow = now
        }
        let events = ((try? context.fetch(FetchDescriptor<LearningEventRecord>())) ?? []).map(RecordMapping.event)
        let records = (try? context.fetch(FetchDescriptor<ConceptRecord>())) ?? []
        for record in records {
            let cache = LearnerModel.recomputeConceptCache(
                conceptId: record.id,
                difficulty: record.difficulty,
                events: events,
                now: now
            )
            RecordMapping.apply(cache, to: record)
        }
        try? context.save()
        refresh()
    }
    #endif

    private func recomputeConcept(id: String) {
        let events = ((try? context.fetch(FetchDescriptor<LearningEventRecord>())) ?? []).map(RecordMapping.event)
        let descriptor = FetchDescriptor<ConceptRecord>(predicate: #Predicate { $0.id == id })
        guard let record = try? context.fetch(descriptor).first else { return }
        let cache = LearnerModel.recomputeConceptCache(
            conceptId: id,
            difficulty: record.difficulty,
            events: events,
            now: now
        )
        RecordMapping.apply(cache, to: record)
    }

    private func bootstrapIfNeeded() {
        let profiles = (try? context.fetch(FetchDescriptor<ProfileRecord>())) ?? []
        if profiles.isEmpty {
            seedDemo()
        }
    }

    private func seedDemo() {
        let snapshot = DemoSeed.snapshot(now: now)
        context.insert(
            ProfileRecord(
                id: snapshot.profile.id,
                displayName: snapshot.profile.displayName,
                simulatedNow: now
            )
        )
        let course = CourseRecord(
            id: snapshot.course.id,
            name: snapshot.course.name,
            typicalMinutes: snapshot.course.typicalMinutes
        )
        context.insert(course)
        let exam = ExamRecord(
            id: snapshot.exam.id,
            date: snapshot.exam.date,
            targetGrade: snapshot.exam.targetGrade,
            evidenceConfidence: snapshot.exam.evidenceConfidence
        )
        exam.course = course
        context.insert(exam)
        var records: [String: ConceptRecord] = [:]
        for concept in snapshot.concepts {
            let record = ConceptRecord(
                id: concept.id,
                name: concept.name,
                importance: concept.importance,
                difficulty: concept.difficulty,
                mastery: concept.mastery,
                confidence: concept.confidence,
                predictedRetention: concept.predictedRetention,
                lastReviewedAt: concept.lastReviewedAt,
                nextReviewAt: concept.nextReviewAt,
                retrievalAttempts: concept.retrievalAttempts,
                successfulRetrievals: concept.successfulRetrievals,
                failedRetrievals: concept.failedRetrievals
            )
            record.course = course
            context.insert(record)
            records[concept.id] = record
        }
        for prompt in snapshot.prompts {
            let row = PromptRecord(id: prompt.id, question: prompt.question, modelAnswer: prompt.modelAnswer)
            row.concept = records[prompt.conceptId]
            context.insert(row)
        }
        for relationship in snapshot.relationships {
            context.insert(
                RelationshipRecord(
                    id: relationship.id,
                    fromId: relationship.fromId,
                    toId: relationship.toId,
                    kind: relationship.kind.rawValue
                )
            )
        }
        for event in snapshot.events {
            context.insert(
                LearningEventRecord(
                    id: event.id,
                    conceptId: event.conceptId,
                    sessionId: event.sessionId,
                    kind: event.kind.rawValue,
                    outcome: event.outcome.rawValue,
                    promptId: event.promptId,
                    responseText: event.responseText,
                    masteryBefore: event.masteryBefore,
                    masteryAfter: event.masteryAfter,
                    createdAt: event.createdAt
                )
            )
        }
        try? context.save()
    }

    private func deleteAll() {
        ((try? context.fetch(FetchDescriptor<LearningEventRecord>())) ?? []).forEach { context.delete($0) }
        ((try? context.fetch(FetchDescriptor<PromptRecord>())) ?? []).forEach { context.delete($0) }
        ((try? context.fetch(FetchDescriptor<RelationshipRecord>())) ?? []).forEach { context.delete($0) }
        ((try? context.fetch(FetchDescriptor<SessionRecord>())) ?? []).forEach { context.delete($0) }
        ((try? context.fetch(FetchDescriptor<ConceptRecord>())) ?? []).forEach { context.delete($0) }
        ((try? context.fetch(FetchDescriptor<ExamRecord>())) ?? []).forEach { context.delete($0) }
        ((try? context.fetch(FetchDescriptor<CourseRecord>())) ?? []).forEach { context.delete($0) }
    }
}

enum SeedRating: String, CaseIterable, Identifiable {
    case neverLearned = "Never learned"
    case weak = "Weak"
    case okay = "Okay"
    case strong = "Strong"

    var id: String { rawValue }

    var mastery: Double {
        switch self {
        case .neverLearned: 0
        case .weak: 0.28
        case .okay: 0.58
        case .strong: 0.86
        }
    }

    var outcome: RetrievalOutcome {
        switch self {
        case .neverLearned, .weak: .failure
        case .okay: .partial
        case .strong: .success
        }
    }
}
