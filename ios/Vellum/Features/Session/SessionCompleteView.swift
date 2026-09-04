import SwiftUI
import VellumDomain

struct SessionCompleteView: View {
    @Environment(VellumStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Session complete")
                            .font(.vellumDisplay)
                            .foregroundStyle(VellumTheme.ink)
                        Text("\(summary.plannedMinutes) min")
                            .font(.title3)
                            .foregroundStyle(VellumTheme.muted)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Readiness")
                            .font(.subheadline)
                            .foregroundStyle(VellumTheme.muted)
                        Text("\(Format.percent(summary.readinessBefore))% → \(Format.percent(summary.readinessAfter))%")
                            .font(.title.weight(.semibold))
                            .foregroundStyle(VellumTheme.ink)
                            .accessibilityLabel(
                                "Readiness changed from \(Format.percent(summary.readinessBefore)) percent to \(Format.percent(summary.readinessAfter)) percent"
                            )
                    }

                    if !summary.conceptDeltas.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(summary.conceptDeltas, id: \.conceptId) { delta in
                                HStack {
                                    Text(delta.name)
                                        .foregroundStyle(VellumTheme.ink)
                                    Spacer()
                                    Text("\(Format.percent(delta.before))% → \(Format.percent(delta.after))%")
                                        .font(.body.monospacedDigit())
                                        .foregroundStyle(VellumTheme.muted)
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("YOUR PLAN HAS CHANGED")
                            .font(.caption.weight(.semibold))
                            .tracking(1.4)
                            .foregroundStyle(VellumTheme.muted)
                        Text("Tomorrow")
                            .font(.headline)
                        ForEach(Array(summary.tomorrowNames.enumerated()), id: \.offset) { index, name in
                            Text("\(index + 1). \(name)")
                                .font(.body)
                                .foregroundStyle(VellumTheme.ink)
                        }
                    }
                }
                .padding(24)
            }
            .background(VellumTheme.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                Button("Done") {
                    store.dismissComplete()
                }
                .buttonStyle(.borderedProminent)
                .tint(VellumTheme.accent)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
            }
        }
    }

    private var summary: SessionSummary {
        store.lastSummary ?? SessionSummary(
            plannedMinutes: store.plan.plannedMinutes,
            readinessBefore: store.readiness,
            readinessAfter: store.readiness,
            conceptDeltas: [],
            tomorrowNames: []
        )
    }
}
