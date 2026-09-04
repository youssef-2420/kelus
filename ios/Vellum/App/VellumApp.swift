import SwiftData
import SwiftUI

@main
struct VellumApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [
            ProfileRecord.self,
            CourseRecord.self,
            ExamRecord.self,
            ConceptRecord.self,
            RelationshipRecord.self,
            PromptRecord.self,
            SessionRecord.self,
            LearningEventRecord.self,
        ])
    }
}

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var store: VellumStore?

    var body: some View {
        Group {
            if let store {
                ContentView()
                    .environment(store)
            } else {
                Color(VellumTheme.background).ignoresSafeArea()
            }
        }
        .onAppear {
            if store == nil {
                store = VellumStore(context: modelContext)
            }
        }
    }
}

struct ContentView: View {
    @Environment(VellumStore.self) private var store

    var body: some View {
        @Bindable var store = store
        TabView {
            NavigationStack {
                TodayView()
            }
            .tabItem {
                Label("Today", systemImage: "sun.max")
            }

            NavigationStack {
                CoursesView()
            }
            .tabItem {
                Label("Courses", systemImage: "text.book.closed")
            }
        }
        .tint(VellumTheme.accent)
        .fullScreenCover(isPresented: $store.showingSession) {
            NavigationStack {
                SessionView()
            }
            .environment(store)
        }
        .sheet(isPresented: $store.showingComplete) {
            SessionCompleteView()
                .environment(store)
                .presentationDetents([.large])
        }
        .sheet(isPresented: $store.showingSetup) {
            NavigationStack {
                ExamSetupView()
            }
            .environment(store)
        }
    }
}
