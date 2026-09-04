import SwiftUI
import VellumDomain

struct CoursesView: View {
    @Environment(VellumStore.self) private var store

    var body: some View {
        List {
            Section {
                LabeledContent("Course", value: store.courseName)
                if let exam = store.exam {
                    LabeledContent("Exam") {
                        Text(exam.date, format: .dateTime.month(.wide).day().year())
                    }
                    LabeledContent("Target", value: "\(Format.percent(exam.targetGrade))%")
                    LabeledContent("Study block", value: "\(store.typicalMinutes) min/day")
                }
            } header: {
                Text("Exam")
            }

            Section {
                ForEach(store.plan.ranked, id: \.concept.id) { row in
                    NavigationLink {
                        ConceptDetailView(conceptId: row.concept.id)
                    } label: {
                        IntelligenceRow(row: row)
                    }
                }
            } header: {
                Text("Exam intelligence")
            } footer: {
                Text("Weakest is not always next. Importance, forgetting, and prerequisites change the order.")
            }

            Section("Concepts") {
                ForEach(store.concepts, id: \.id) { concept in
                    NavigationLink(concept.name) {
                        ConceptDetailView(conceptId: concept.id)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(VellumTheme.background.ignoresSafeArea())
        .navigationTitle("Courses")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Add concept", systemImage: "plus") {
                    showingAdd = true
                }
            }
            ToolbarItem(placement: .topBarLeading) {
                Button("New exam") {
                    store.showingSetup = true
                }
            }
        }
        .sheet(isPresented: $showingAdd) {
            NavigationStack {
                AddConceptView()
            }
            .environment(store)
        }
    }

    @State private var showingAdd = false
}

struct IntelligenceRow: View {
    let row: RankedConcept

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(row.concept.name)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(VellumTheme.ink)
                Spacer()
                Text(priorityLabel)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(VellumTheme.muted)
            }
            Text(importanceLabel)
                .font(.subheadline)
                .foregroundStyle(VellumTheme.muted)
            Text("\(Format.percent(row.concept.mastery))% mastery · \(row.status.displayName)")
                .font(.subheadline)
                .foregroundStyle(VellumTheme.ink)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    private var importanceLabel: String {
        if row.concept.importance >= 0.85 { return "Very high importance" }
        if row.concept.importance >= 0.7 { return "High importance" }
        if row.concept.importance >= 0.5 { return "Moderate importance" }
        return "Low importance"
    }

    private var priorityLabel: String {
        if row.status == .strong { return "Strong" }
        if row.concept.importance < 0.5 { return "Lower priority" }
        if row.status == .weak || row.status == .fading || row.status == .notLearned {
            return "Priority"
        }
        return row.status.displayName
    }
}

struct AddConceptView: View {
    @Environment(VellumStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var rating: SeedRating = .okay

    var body: some View {
        Form {
            Section {
                TextField("Concept name", text: $name)
                Picker("Starting confidence", selection: $rating) {
                    ForEach(SeedRating.allCases) { item in
                        Text(item.rawValue).tag(item)
                    }
                }
            } footer: {
                Text("A first rating is a guess. Retrieval will replace it.")
            }
        }
        .navigationTitle("Add concept")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Add") {
                    store.addConcept(name: name.trimmingCharacters(in: .whitespacesAndNewlines), rating: rating)
                    dismiss()
                }
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }
}
