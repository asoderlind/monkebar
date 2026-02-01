import { useState } from "react";
import { useSession } from "./lib/auth";
import { LogWorkoutView } from "./components/views/LogWorkoutView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { HistoryView } from "./components/views/HistoryView";
import { ExercisesView } from "./components/views/ExercisesView";
import { MeasurementsView } from "./components/views/MeasurementsView";
import { SettingsView } from "./components/views/SettingsView";
import { LoginView } from "./components/views/LoginView";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";
import { useLocalStorage } from "./hooks/useLocalStorage";

type View = "log" | "analytics" | "history" | "exercises" | "measurements" | "settings";

function App() {
  const { data: session, isPending } = useSession();
  const [currentView, setCurrentView] = useState<View>("log");
  const [restTimerDuration, setRestTimerDuration] = useLocalStorage<number>("restTimerDuration", 120);

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onSettingsClick={() => setCurrentView("settings")} />

      <main className="flex-1 pb-20">
        {currentView === "log" && (
          <LogWorkoutView restTimerDuration={restTimerDuration} />
        )}
        {currentView === "analytics" && <AnalyticsView />}
        {currentView === "history" && <HistoryView />}
        {currentView === "exercises" && <ExercisesView />}
        {currentView === "measurements" && <MeasurementsView />}
        {currentView === "settings" && (
          <SettingsView
            restTimerDuration={restTimerDuration}
            onRestTimerDurationChange={setRestTimerDuration}
          />
        )}
      </main>

      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default App;
