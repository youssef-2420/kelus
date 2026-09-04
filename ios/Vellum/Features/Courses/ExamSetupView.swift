import SwiftUI
import VellumDomain

struct ExamSetupView: View {
    @Environment(VellumStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var date = Date().addingTimeInterval(11 * LearnerConstants.secondsPerDay)
    @State private var target = 85
    @State private var minutes = 45

    var body: some View {
        Form {
            Section {
                TextField("Course name", text: $name)
                    .textInputAutocapitalization(.words)
                DatePicker("Exam date", selection: $date, displayedComponents: .date)
                Stepper(value: $target, in: 50...100, step: 5) {
                    Text("Target \(target)%")
                }
                Stepper(value: $minutes, in: 20...90, step: 5) {
                    Text("\(minutes) min/day")
                }
            } footer: {
                Text("Vellum will decide what to study. You only set the destination.")
            }
        }
        .navigationTitle("Exam plan")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Create exam plan") {
                    store.createExam(
                        name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                        date: date,
                        targetPercent: target,
                        minutes: minutes
                    )
                }
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }
}
