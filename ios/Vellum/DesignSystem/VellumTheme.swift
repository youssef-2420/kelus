import SwiftUI
import VellumDomain

enum VellumTheme {
    static let background = Color(red: 0.975, green: 0.965, blue: 0.948)
    static let surface = Color(red: 0.995, green: 0.992, blue: 0.985)
    static let hairline = Color(red: 0.86, green: 0.84, blue: 0.80)
    static let ink = Color(red: 0.10, green: 0.10, blue: 0.09)
    static let muted = Color(red: 0.42, green: 0.41, blue: 0.38)
    static let accent = Color(red: 0.16, green: 0.34, blue: 0.27)

    static func status(_ status: ConceptStatus) -> Color {
        switch status {
        case .strong: Color(red: 0.16, green: 0.42, blue: 0.30)
        case .stable: Color(red: 0.28, green: 0.46, blue: 0.36)
        case .fading: Color(red: 0.72, green: 0.48, blue: 0.16)
        case .weak: Color(red: 0.62, green: 0.24, blue: 0.20)
        case .notLearned: Color(red: 0.45, green: 0.44, blue: 0.42)
        }
    }
}

extension Font {
    static var vellumDisplay: Font {
        .system(.largeTitle, design: .serif).weight(.semibold)
    }

    static var vellumTitle: Font {
        .system(.title2, design: .serif).weight(.semibold)
    }
}
