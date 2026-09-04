import SwiftUI
import VellumDomain

struct TodayView: View {
    @Environment(VellumStore.self) private var store

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header
                readiness
                plan
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(VellumTheme.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            #if DEBUG
            ToolbarItem(placement: .topBarTrailing) {
                Button("Skip a day") {
                    store.skipDay()
                }
                .accessibilityLabel("Advance simulated time by one day")
                .accessibilityHint("Development only. Observes knowledge decay.")
            }
            #endif
        }
        .safeAreaInset(edge: .bottom) {
            Button {
                store.startSession()
            } label: {
                Text("Start \(store.plan.plannedMinutes)-minute session")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .tint(VellumTheme.accent)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(VellumTheme.background)
            .accessibilityHint("Begins the recommended study block")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(greeting)
                .font(.vellumDisplay)
                .foregroundStyle(VellumTheme.ink)
                .accessibilityAddTraits(.isHeader)
            Text(store.courseName.isEmpty ? "No course yet" : "\(store.courseName) Final")
                .font(.title3.weight(.medium))
                .foregroundStyle(VellumTheme.ink)
            Text("\(store.daysRemaining) days remaining")
                .font(.body)
                .foregroundStyle(VellumTheme.muted)
        }
        .accessibilityElement(children: .combine)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: store.now)
        let part: String
        if hour < 12 { part = "Good morning" }
        else if hour < 18 { part = "Good afternoon" }
        else { part = "Good evening" }
        return "\(part), \(store.greetingName)"
    }

    private var readiness: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text("\(Format.percent(store.readiness))%")
                    .font(.system(size: 56, weight: .semibold, design: .serif))
                    .foregroundStyle(VellumTheme.ink)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Text(store.readinessLabel)
                    .font(.subheadline.weight(.semibold))
                    .tracking(1.2)
                    .foregroundStyle(VellumTheme.accent)
                    .accessibilityLabel("Readiness \(store.readinessLabel.lowercased())")
            }
            Text("You have \(store.typicalMinutes) minutes today")
                .font(.body)
                .foregroundStyle(VellumTheme.muted)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "Readiness \(Format.percent(store.readiness)) percent, \(store.readinessLabel.lowercased()). \(store.typicalMinutes) minutes available today."
        )
    }

    private var plan: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("BEST USE OF YOUR TIME")
                .font(.caption.weight(.semibold))
                .tracking(1.4)
                .foregroundStyle(VellumTheme.muted)
            VStack(spacing: 0) {
                ForEach(Array(store.plan.blocks.enumerated()), id: \.element.id) { index, block in
                    if index > 0 {
                        Divider().overlay(VellumTheme.hairline)
                    }
                    if let conceptId = block.conceptId {
                        NavigationLink {
                            ConceptDetailView(conceptId: conceptId)
                        } label: {
                            PlanRow(block: block)
                        }
                        .buttonStyle(.plain)
                    } else {
                        PlanRow(block: block)
                    }
                }
            }
            .padding(.horizontal, 4)
        }
    }
}

struct PlanRow: View {
    let block: PlanBlock

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 16) {
            Text("\(block.minutes) min")
                .font(.body.weight(.semibold).monospacedDigit())
                .foregroundStyle(VellumTheme.ink)
                .frame(width: 64, alignment: .leading)
            VStack(alignment: .leading, spacing: 4) {
                Text(block.title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(VellumTheme.ink)
                Text(block.reason)
                    .font(.subheadline)
                    .foregroundStyle(VellumTheme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 14)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(block.minutes) minutes. \(block.title). \(block.reason)")
    }
}
