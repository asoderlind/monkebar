import { useState } from "react";
import { useSession } from "./lib/auth";
import { LogWorkoutView } from "./components/views/LogWorkoutView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { HistoryView } from "./components/views/HistoryView";
import { ExercisesView } from "./components/views/ExercisesView";
import { SettingsView } from "./components/views/SettingsView";
import { LoginView } from "./components/views/LoginView";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";
import { useLocalStorage } from "./hooks/useLocalStorage";

type View = "log" | "analytics" | "history" | "exercises" | "settings";
type DatabaseMode = "sheets" | "postgres";

function App() {
  const { data: session, isPending } = useSession();
  const [currentView, setCurrentView] = useState<View>("log");
  const [spreadsheetId, setSpreadsheetId] = useLocalStorage<string | null>(
    "spreadsheetId",
    null
  );
  const [sheetName, setSheetName] = useLocalStorage<string>(
    "sheetName",
    "Sheet1"
  );
  const [databaseMode, setDatabaseMode] = useLocalStorage<DatabaseMode>(
    "databaseMode",
    "sheets"
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
        databaseMode={databaseMode}
        onDatabaseModeChange={setDatabaseMode}
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
        databaseMode={databaseMode}
      />

      <main className="flex-1 pb-20">
        {currentView === "log" && (
          <LogWorkoutView
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            databaseMode={databaseMode}
          />
        )}
        {currentView === "analytics" && (
          <AnalyticsView
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            databaseMode={databaseMode}
          />
        )}
        {currentView === "history" && (
          <HistoryView
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            databaseMode={databaseMode}
          />
        )}
        {currentView === "exercises" && <ExercisesView />}
        {currentView === "settings" && (
          <SettingsView
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            onSpreadsheetChange={setSpreadsheetId}
            onSheetNameChange={setSheetName}
            databaseMode={databaseMode}
            onDatabaseModeChange={setDatabaseMode}
          />
        )}
      </main>

      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}

export default App;
