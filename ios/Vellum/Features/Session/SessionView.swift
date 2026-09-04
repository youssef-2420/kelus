import SwiftUI
import UIKit
import VellumDomain

struct SessionView: View {
    @Environment(VellumStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var index = 0
    @State private var response = ""
    @State private var revealed = false
    @State private var lastDelta: (before: Double, after: Double)?

    var body: some View {
        Group {
            if store.sessionItems.isEmpty {
                ContentUnavailableView(
                    "No prompts yet",
                    systemImage: "text.page",
                    description: Text("Add concepts with questions in Courses.")
                )
            } else if index >= store.sessionItems.count {
                ContentUnavailableView("Finishing", systemImage: "checkmark")
            } else {
                itemView(store.sessionItems[index])
            }
        }
        .background(VellumTheme.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("End") {
                    store.completeSession()
                }
            }
        }
    }

    private func itemView(_ item: SessionItem) -> some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.conceptName)
                    .font(.headline)
                    .foregroundStyle(VellumTheme.ink)
                Text("Question \(index + 1) of \(store.sessionItems.count)")
                    .font(.subheadline)
                    .foregroundStyle(VellumTheme.muted)
            }

            Text(item.question)
                .font(.title3)
                .foregroundStyle(VellumTheme.ink)
                .fixedSize(horizontal: false, vertical: true)

            TextField("Your answer", text: $response, axis: .vertical)
                .lineLimit(3...6)
                .textFieldStyle(.roundedBorder)
                .disabled(revealed)

            if revealed {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Model answer")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(VellumTheme.muted)
                    Text(item.modelAnswer)
                        .font(.body)
                        .foregroundStyle(VellumTheme.ink)
                }

                if let lastDelta {
                    Text("Mastery \(Format.percent(lastDelta.before))% → \(Format.percent(lastDelta.after))%")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(VellumTheme.accent)
                        .accessibilityLabel(
                            "Mastery changed from \(Format.percent(lastDelta.before)) percent to \(Format.percent(lastDelta.after)) percent"
                        )
                } else {
                    Text("How well did you know this?")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(VellumTheme.ink)
                    HStack(spacing: 8) {
                        ratingButton("Knew it", outcome: .success, item: item)
                        ratingButton("Mostly", outcome: .partial, item: item)
                        ratingButton("Didn't know", outcome: .failure, item: item)
                    }
                }
            } else {
                Button("Reveal answer") {
                    revealed = true
                }
                .buttonStyle(.borderedProminent)
                .tint(VellumTheme.accent)
                .disabled(response.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            Spacer()
        }
        .padding(20)
        .animation(reduceMotion ? nil : .snappy(duration: 0.25), value: revealed)
        .animation(reduceMotion ? nil : .snappy(duration: 0.25), value: lastDelta?.after)
    }

    private func ratingButton(_ title: String, outcome: RetrievalOutcome, item: SessionItem) -> some View {
        Button(title) {
            lastDelta = store.applyRating(item: item, outcome: outcome, response: response)
            haptic(for: outcome)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                advance()
            }
        }
        .buttonStyle(.bordered)
        .tint(VellumTheme.accent)
        .frame(maxWidth: .infinity)
        .accessibilityHint("Rates this retrieval and updates mastery")
    }

    private func advance() {
        response = ""
        revealed = false
        lastDelta = nil
        index += 1
        if index >= store.sessionItems.count {
            store.completeSession()
        }
    }

    private func haptic(for outcome: RetrievalOutcome) {
        switch outcome {
        case .success:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .partial:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .failure:
            UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        }
    }
}
