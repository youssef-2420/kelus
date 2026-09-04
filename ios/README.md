# Vellum (iPhone MVP)

Native SwiftUI app that answers: **what should I study right now** given an exam, remaining time, and what is fading.

This directory is self-contained. The existing Next.js app in the repo root is a separate product (Kelus) and is not used at runtime.

## Architecture

```
ios/
  Domain/                 Pure Swift package (no SwiftUI / SwiftData)
  Vellum/                 iOS app sources
  Vellum.xcodeproj        iPhone app (Xcode 16+)
```

**Domain** owns mastery, retention, status, priority, session planning, and learning events.  
**App** owns SwiftData persistence, navigation, and presentation. UI never computes study value.

### Apple APIs used

- SwiftUI (`NavigationStack`, `TabView` with two tabs, `Form`, `List`, sheets / full-screen cover)
- SwiftData (`@Model`, `ModelContainer`)
- Observation (`@Observable` store)
- Swift Testing (domain package)
- SF Symbols, Dynamic Type, `UIImpactFeedbackGenerator` / `UINotificationFeedbackGenerator`
- `accessibilityReduceMotion`

Deployment: **iOS 18**, iPhone only.

## What this MVP does not include

AI, chat, PDF, cloud, accounts, notifications, widgets, Watch, iPad/macOS layouts, streaks, Anki, subscriptions.

## Domain tests (Linux / Mac)

```sh
cd ios/Domain
swift test
```

## App (Mac + Xcode)

Open `ios/Vellum.xcodeproj`, select an iPhone simulator, Run.

This Linux environment cannot run `xcodebuild` or the iOS Simulator. Domain tests are the automated gate here.

## Demo

First launch seeds **Maya / Microeconomics / 11 days / 45 min**.  
Debug builds only: **Skip a day** on Today to observe decay. That control is compiled out of Release.
