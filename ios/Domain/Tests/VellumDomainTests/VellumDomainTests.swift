import Foundation
import Testing
@testable import VellumDomain

private let now = Date(timeIntervalSince1970: 1_757_030_400) // 2025-09-05 00:00 UTC-ish; used only as a fixed origin

@Suite("Learner model")
struct LearnerModelTests {
    @Test("algorithm is an explicit MVP heuristic")
    func algorithmKind() {
        #expect(LearnerConstants.algorithmKind == "vellum-mvp-heuristic-v1")
    }

    @Test("success raises mastery; failure multiplies it")
    func masteryUpdates() {
        let up = LearnerModel.applyRetrievalMastery(
            mastery: 0.5,
            outcome: .success,
            difficulty: 0.4,
            successfulRetrievals: 1
        )
        let down = LearnerModel.applyRetrievalMastery(
            mastery: 0.5,
            outcome: .failure,
            difficulty: 0.4,
            successfulRetrievals: 1
        )
        #expect(up > 0.5 && up <= 1)
        #expect(down == 0.5 * LearnerConstants.masteryFailMultiplier)
    }

    @Test("repeated successes produce diminishing gains")
    func diminishingReturns() {
        let first = LearnerModel.applyRetrievalMastery(
            mastery: 0.5,
            outcome: .success,
            difficulty: 0.4,
            successfulRetrievals: 0
        )
        let later = LearnerModel.applyRetrievalMastery(
            mastery: 0.5,
            outcome: .success,
            difficulty: 0.4,
            successfulRetrievals: 12
        )
        #expect(first - 0.5 > later - 0.5)
    }

    @Test("partial increases mastery less than success")
    func partialVsSuccess() {
        let success = LearnerModel.applyRetrievalMastery(
            mastery: 0.4,
            outcome: .success,
            difficulty: 0.5,
            successfulRetrievals: 2
        )
        let partial = LearnerModel.applyRetrievalMastery(
            mastery: 0.4,
            outcome: .partial,
            difficulty: 0.5,
            successfulRetrievals: 2
        )
        #expect(success > partial)
        #expect(partial > 0.4)
    }

    @Test("unseen concepts are not learned")
    func notLearned() {
        #expect(LearnerModel.deriveStatus(mastery: 0, retention: 0, retrievalAttempts: 0) == .notLearned)
    }

    @Test("seeded mastery without retrievals is still classified")
    func seededStrong() {
        #expect(LearnerModel.deriveStatus(mastery: 0.9, retention: 0.8, retrievalAttempts: 0) == .strong)
    }

    @Test("weak and fading thresholds")
    func statusBands() {
        #expect(LearnerModel.deriveStatus(mastery: 0.2, retention: 0.2, retrievalAttempts: 3) == .weak)
        #expect(LearnerModel.deriveStatus(mastery: 0.7, retention: 0.45, retrievalAttempts: 4) == .fading)
        #expect(LearnerModel.deriveStatus(mastery: 0.6, retention: 0.58, retrievalAttempts: 3) == .stable)
    }

    @Test("recompute treats events as immutable history")
    func recomputeCache() {
        let events = [
            LearningEvent(
                id: "e0",
                conceptId: "c1",
                sessionId: nil,
                kind: .seedRating,
                outcome: .partial,
                promptId: nil,
                responseText: nil,
                masteryBefore: 0,
                masteryAfter: 0.5,
                createdAt: now.addingTimeInterval(-33 * LearnerConstants.secondsPerDay)
            ),
            LearningEvent(
                id: "e1",
                conceptId: "c1",
                sessionId: "s",
                kind: .retrieval,
                outcome: .success,
                promptId: "p",
                responseText: "ok",
                masteryBefore: 0.5,
                masteryAfter: 0.6,
                createdAt: now.addingTimeInterval(-14 * LearnerConstants.secondsPerDay)
            ),
        ]
        let cache = LearnerModel.recomputeConceptCache(
            conceptId: "c1",
            difficulty: 0.5,
            events: events,
            now: now
        )
        #expect(cache.mastery > 0.5)
        #expect(cache.retrievalAttempts == 1)
        #expect(cache.successfulRetrievals == 2)
        #expect(cache.predictedRetention <= cache.mastery + 0.0001)
        #expect(cache.nextReviewAt != nil)
    }
}

@Suite("Retention")
struct RetentionTests {
    @Test("retention decays with time since last success")
    func decay() {
        let fresh = RetentionEngine.predictedRetention(
            mastery: 0.8,
            successfulRetrievals: 4,
            lastSuccessAt: now,
            now: now
        )
        let stale = RetentionEngine.predictedRetention(
            mastery: 0.8,
            successfulRetrievals: 4,
            lastSuccessAt: now.addingTimeInterval(-33 * LearnerConstants.secondsPerDay),
            now: now
        )
        #expect(fresh > stale)
        #expect(stale >= 0 && stale <= 1)
    }
}

@Suite("Scheduler")
struct SchedulerTests {
    @Test("exam urgency rises as the date approaches")
    func urgency() {
        let far = Exam(id: "e", courseId: "c", date: now.addingTimeInterval(28 * LearnerConstants.secondsPerDay), targetGrade: 0.85)
        let near = Exam(id: "e", courseId: "c", date: now.addingTimeInterval(2 * LearnerConstants.secondsPerDay), targetGrade: 0.85)
        #expect(StudyScheduler.examUrgency(near, now: now) > StudyScheduler.examUrgency(far, now: now))
        #expect(StudyScheduler.daysUntilExam(near, now: now) == 2)
    }

    @Test("weak prerequisite outranks a weak advanced topic")
    func prerequisiteBoost() {
        let exam = Exam(id: "ex", courseId: "co", date: now.addingTimeInterval(18 * LearnerConstants.secondsPerDay), targetGrade: 0.85)
        let concepts = [
            Concept(
                id: "prereq",
                courseId: "co",
                name: "Prereq",
                importance: 0.8,
                difficulty: 0.4,
                mastery: 0.2,
                predictedRetention: 0.15,
                lastReviewedAt: now,
                retrievalAttempts: 2,
                failedRetrievals: 2
            ),
            Concept(
                id: "advanced",
                courseId: "co",
                name: "Advanced",
                importance: 0.9,
                difficulty: 0.6,
                mastery: 0.3,
                predictedRetention: 0.2,
                lastReviewedAt: now,
                retrievalAttempts: 2,
                failedRetrievals: 2
            ),
        ]
        let relationships = [ConceptRelationship(id: "r", fromId: "prereq", toId: "advanced", kind: .prerequisite)]
        let ranked = StudyScheduler.rankConcepts(concepts, exam: exam, relationships: relationships, now: now)
        let prereq = ranked.first { $0.concept.id == "prereq" }?.studyValue ?? 0
        let advanced = ranked.first { $0.concept.id == "advanced" }?.studyValue ?? 0
        #expect(prereq > advanced)
    }

    @Test("weakest topic is not automatically first when importance is low")
    func weakestIsNotAlwaysNext() {
        let exam = Exam(id: "ex", courseId: "co", date: now.addingTimeInterval(11 * LearnerConstants.secondsPerDay), targetGrade: 0.85)
        let concepts = [
            Concept(
                id: "game",
                courseId: "co",
                name: "Game Theory",
                importance: 0.3,
                difficulty: 0.7,
                mastery: 0.2,
                predictedRetention: 0.15,
                lastReviewedAt: now,
                retrievalAttempts: 3,
                failedRetrievals: 2
            ),
            Concept(
                id: "elast",
                courseId: "co",
                name: "Elasticity",
                importance: 0.95,
                difficulty: 0.5,
                mastery: 0.42,
                predictedRetention: 0.3,
                lastReviewedAt: now,
                retrievalAttempts: 3,
                successfulRetrievals: 1,
                failedRetrievals: 1
            ),
        ]
        let ranked = StudyScheduler.rankConcepts(concepts, exam: exam, relationships: [], now: now)
        #expect(ranked.first?.concept.id == "elast")
    }

    @Test("session allocation fills the available minutes")
    func allocation() {
        let snapshot = DemoSeed.snapshot(now: now)
        let plan = StudyScheduler.planStudyBlock(
            concepts: snapshot.concepts,
            exam: snapshot.exam,
            relationships: snapshot.relationships,
            availableMinutes: 45,
            now: now
        )
        #expect(plan.plannedMinutes == 45)
        #expect(plan.blocks.contains { $0.kind == .mixedRetrieval })
        #expect(plan.blocks.filter { $0.kind == .concept }.count >= 3)
        #expect(plan.blocks.first?.title == "Elasticity" || plan.ranked.first?.concept.name == "Elasticity")
    }

    @Test("readiness is importance-weighted mastery")
    func readiness() {
        let concepts = [
            Concept(id: "a", courseId: "c", name: "A", importance: 1, difficulty: 0.4, mastery: 1),
            Concept(id: "b", courseId: "c", name: "B", importance: 1, difficulty: 0.4, mastery: 0),
        ]
        #expect(abs(StudyScheduler.readiness(concepts: concepts) - 0.5) < 0.0001)
    }
}

@Suite("Session")
struct SessionTests {
    @Test("retrieval event records mastery before and after")
    func learningEvent() {
        let concept = Concept(
            id: "c1",
            courseId: "co",
            name: "Elasticity",
            importance: 0.9,
            difficulty: 0.5,
            mastery: 0.4,
            predictedRetention: 0.35,
            lastReviewedAt: now,
            retrievalAttempts: 1,
            failedRetrievals: 1
        )
        let event = SessionEngine.createRetrievalEvent(
            id: "e2",
            concept: concept,
            sessionId: "s1",
            promptId: "p1",
            responseText: "substitutes",
            outcome: .success,
            createdAt: now
        )
        #expect(event.kind == .retrieval)
        #expect(event.masteryBefore == 0.4)
        #expect(event.masteryAfter > 0.4)

        let seed = LearningEvent(
            id: "e0",
            conceptId: "c1",
            sessionId: nil,
            kind: .seedRating,
            outcome: .partial,
            promptId: nil,
            responseText: nil,
            masteryBefore: 0,
            masteryAfter: 0.4,
            createdAt: now.addingTimeInterval(-30 * LearnerConstants.secondsPerDay)
        )
        let after = LearnerModel.recomputeConceptCache(
            conceptId: "c1",
            difficulty: 0.5,
            events: [seed, event],
            now: now
        )
        #expect(after.mastery > 0.4)
        let summary = SessionEngine.summarize(
            plannedMinutes: 45,
            before: [concept],
            after: [LearnerModel.applying(after, to: concept)],
            exam: Exam(id: "e", courseId: "co", date: now.addingTimeInterval(11 * LearnerConstants.secondsPerDay), targetGrade: 0.85),
            relationships: [],
            now: now
        )
        #expect(summary.readinessAfter > summary.readinessBefore)
        #expect(summary.conceptDeltas.contains { $0.conceptId == "c1" })
    }

    @Test("ratings change mastery and can reorder the plan")
    func ratingsReorderPlan() {
        let snapshot = DemoSeed.snapshot(now: now)
        let exam = snapshot.exam
        let relationships = snapshot.relationships
        var concepts = snapshot.concepts
        var events = snapshot.events
        let beforePlan = StudyScheduler.planStudyBlock(
            concepts: concepts,
            exam: exam,
            relationships: relationships,
            availableMinutes: 45,
            now: now
        )
        guard let elasticity = concepts.first(where: { $0.name == "Elasticity" }) else {
            Issue.record("missing Elasticity")
            return
        }
        let success = SessionEngine.createRetrievalEvent(
            id: "loop-1",
            concept: elasticity,
            sessionId: "s-loop",
            promptId: "p-c-elasticity-1",
            responseText: "substitutes",
            outcome: .success,
            createdAt: now
        )
        events.append(success)
        concepts = LearnerModel.refreshConcepts(concepts, events: events, now: now)
        let afterPlan = StudyScheduler.planStudyBlock(
            concepts: concepts,
            exam: exam,
            relationships: relationships,
            availableMinutes: 45,
            now: now
        )
        let beforeMastery = beforePlan.ranked.first { $0.concept.name == "Elasticity" }?.concept.mastery ?? 0
        let afterMastery = afterPlan.ranked.first { $0.concept.name == "Elasticity" }?.concept.mastery ?? 0
        #expect(afterMastery > beforeMastery)
        #expect(StudyScheduler.readiness(concepts: concepts) >= StudyScheduler.readiness(concepts: snapshot.concepts))
    }

    @Test("session queue is one item at a time from the plan")
    func queue() {
        let snapshot = DemoSeed.snapshot(now: now)
        let plan = StudyScheduler.planStudyBlock(
            concepts: snapshot.concepts,
            exam: snapshot.exam,
            relationships: snapshot.relationships,
            availableMinutes: 45,
            now: now
        )
        let queue = SessionEngine.buildQueue(plan: plan, concepts: snapshot.concepts, prompts: snapshot.prompts)
        #expect(queue.count == 6)
        #expect(Set(queue.map(\.conceptId)).count >= 2)
    }
}

@Suite("Demo")
struct DemoTests {
    @Test("Maya's course is immediately useful")
    func seed() {
        let snapshot = DemoSeed.snapshot(now: now)
        #expect(snapshot.profile.displayName == "Maya")
        #expect(snapshot.course.name == "Microeconomics")
        #expect(StudyScheduler.daysUntilExam(snapshot.exam, now: now) == 11)
        #expect(snapshot.exam.targetGrade == 0.85)
        #expect(snapshot.concepts.count == 7)
        #expect(snapshot.prompts.count >= snapshot.concepts.count)
        let plan = StudyScheduler.planStudyBlock(
            concepts: snapshot.concepts,
            exam: snapshot.exam,
            relationships: snapshot.relationships,
            availableMinutes: 45,
            now: now
        )
        #expect(plan.plannedMinutes == 45)
        let elasticity = snapshot.concepts.first { $0.name == "Elasticity" }
        let game = snapshot.concepts.first { $0.name == "Game Theory" }
        #expect((elasticity?.mastery ?? 1) < 0.6)
        #expect((game?.importance ?? 1) < (elasticity?.importance ?? 0))
    }

    @Test("demo clock is unavailable outside DEBUG")
    func demoClock() {
        #if DEBUG
        let later = DemoClock.advance(now: now, days: 1)
        #expect(later == now.addingTimeInterval(LearnerConstants.secondsPerDay))
        #expect(DemoClock.isEnabled)
        #else
        #expect(!DemoClock.isEnabled)
        #endif
    }
}
