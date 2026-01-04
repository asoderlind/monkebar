import { useState } from "react";
import { useSession } from "./lib/auth";
import { WorkoutView } from "./components/views/WorkoutView";
import { LogWorkoutView } from "./components/views/LogWorkoutView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { HistoryView } from "./components/views/HistoryView";
import { SettingsView } from "./components/views/SettingsView";
import { LoginView } from "./components/views/LoginView";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";
import { useLocalStorage } from "./hooks/useLocalStorage";

type View = "workout" | "log" | "analytics" | "history" | "settings";

function App() {
  const { data: session, isPending } = useSession();
  const [currentView, setCurrentView] = useState<View>("workout");
  const [spreadsheetId, setSpreadsheetId] = useLocalStorage<string | null>(
    "spreadsheetId",
    null
  );
  const [sheetName, setSheetName] = useLocalStorage<string>(
    "sheetName",
    "Sheet1"
  );

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

  // Need to select a spreadsheet first
  if (!spreadsheetId) {
    return (
      <SettingsView
        spreadsheetId={spreadsheetId}
        sheetName={sheetName}
        onSpreadsheetChange={setSpreadsheetId}
        onSheetNameChange={setSheetName}
        isInitialSetup
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        spreadsheetId={spreadsheetId}
        sheetName={sheetName}
        onSettingsClick={() => setCurrentView("settings")}
      />

      <main className="flex-1 pb-20">
        {currentView === "workout" && (
          <WorkoutView spreadsheetId={spreadsheetId} sheetName={sheetName} />
        )}
        {currentView === "log" && (
          <LogWorkoutView spreadsheetId={spreadsheetId} sheetName={sheetName} />
        )}
        {currentView === "analytics" && (
          <AnalyticsView spreadsheetId={spreadsheetId} sheetName={sheetName} />
        )}
        {currentView === "history" && (
          <HistoryView spreadsheetId={spreadsheetId} sheetName={sheetName} />
        )}
        {currentView === "settings" && (
          <SettingsView
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            onSpreadsheetChange={setSpreadsheetId}
            onSheetNameChange={setSheetName}
          />
        )}
      </main>

      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default App;
