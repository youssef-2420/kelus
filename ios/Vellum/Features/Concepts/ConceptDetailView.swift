import SwiftUI
import VellumDomain

struct ConceptDetailView: View {
    @Environment(VellumStore.self) private var store
    let conceptId: String

    var body: some View {
        Group {
            if let concept {
                List {
                    Section {
                        LabeledContent("Mastery", value: "\(Format.percent(concept.mastery))%")
                        LabeledContent("Predicted retention", value: "\(Format.percent(concept.predictedRetention))%")
                        LabeledContent("Status", value: status.displayName)
                        LabeledContent("Confidence", value: "\(Format.percent(concept.confidence))%")
                    }
                    Section("History") {
                        LabeledContent("Last reviewed") {
                            if let last = concept.lastReviewedAt {
                                Text(last, style: .relative)
                            } else {
                                Text("Not yet")
                            }
                        }
                        LabeledContent("Successful retrievals", value: "\(concept.successfulRetrievals)")
                        LabeledContent("Failed retrievals", value: "\(concept.failedRetrievals)")
                        LabeledContent("Attempts", value: "\(concept.retrievalAttempts)")
                        LabeledContent("Next recommended review") {
                            if let next = concept.nextReviewAt {
                                Text(next, format: .dateTime.month(.abbreviated).day().hour().minute())
                            } else {
                                Text("Now")
                            }
                        }
                    }
                    if !prerequisites.isEmpty {
                        Section("Prerequisites") {
                            ForEach(prerequisites, id: \.id) { item in
                                NavigationLink(item.name) {
                                    ConceptDetailView(conceptId: item.id)
                                }
                            }
                        }
                    }
                    if !related.isEmpty {
                        Section("Related") {
                            ForEach(related, id: \.id) { item in
                                NavigationLink(item.name) {
                                    ConceptDetailView(conceptId: item.id)
                                }
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .background(VellumTheme.background.ignoresSafeArea())
                .navigationTitle(concept.name)
            } else {
                ContentUnavailableView("Concept unavailable", systemImage: "questionmark")
            }
        }
    }

    private var concept: Concept? {
        store.concepts.first { $0.id == conceptId }
    }

    private var status: ConceptStatus {
        guard let concept else { return .notLearned }
        return LearnerModel.deriveStatus(
            mastery: concept.mastery,
            retention: concept.predictedRetention,
            retrievalAttempts: concept.retrievalAttempts
        )
    }

    private var prerequisites: [Concept] {
        store.relationships
            .filter { $0.kind == .prerequisite && $0.toId == conceptId }
            .compactMap { rel in store.concepts.first { $0.id == rel.fromId } }
    }

    private var related: [Concept] {
        store.relationships
            .filter { $0.kind == .related && ($0.fromId == conceptId || $0.toId == conceptId) }
            .compactMap { rel in
                let other = rel.fromId == conceptId ? rel.toId : rel.fromId
                return store.concepts.first { $0.id == other }
            }
    }
}
