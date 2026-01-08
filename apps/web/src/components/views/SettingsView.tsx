import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LogOut,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
} from "lucide-react";
import { dbWorkoutsApi } from "@/lib/api";
import {
  exportWorkoutsToCSV,
  parseCSVToWorkouts,
  downloadCSV,
  generateCSVTemplate,
  CSVValidationError,
} from "@/lib/csv";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettingsViewProps {
  spreadsheetId: string | null;
  sheetName: string;
  onSpreadsheetChange: (id: string | null) => void;
  onSheetNameChange: (name: string) => void;
  databaseMode: "sheets" | "postgres";
  onDatabaseModeChange: (mode: "sheets" | "postgres") => void;
  isInitialSetup?: boolean;
}

export function SettingsView({
  spreadsheetId,
  sheetName,
  onSpreadsheetChange,
  onSheetNameChange,
  databaseMode,
  onDatabaseModeChange,
  isInitialSetup = false,
}: SettingsViewProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Fetch user's spreadsheets
  const { data: spreadsheets, isLoading } = useQuery({
    queryKey: ["spreadsheets"],
    queryFn: async () => {
      const API_BASE =
        import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const res = await fetch(`${API_BASE}/sheets/spreadsheets`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Array<{
        id: string;
        name: string;
        modifiedTime: string;
      }>;
    },
  });

  // Fetch sheet tabs when spreadsheet is selected
  const { data: sheetInfo } = useQuery({
    queryKey: ["sheetInfo", spreadsheetId],
    queryFn: async () => {
      const API_BASE =
        import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const res = await fetch(
        `${API_BASE}/sheets/info?spreadsheetId=${spreadsheetId}`,
        {
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as {
        title: string;
        sheets: Array<{ title: string; sheetId: number }>;
      };
    },
    enabled: !!spreadsheetId,
  });

  const handleLogout = () => {
    signOut();
  };

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      setExportProgress(10);
      const workouts = await dbWorkoutsApi.getAll();
      setExportProgress(50);

      const csv = exportWorkoutsToCSV(workouts);
      setExportProgress(80);

      const timestamp = new Date().toISOString().split("T")[0];
      downloadCSV(csv, `monke-bar-workouts-${timestamp}.csv`);
      setExportProgress(100);

      // Reset progress after a delay
      setTimeout(() => setExportProgress(0), 1000);

      return workouts.length;
    },
    onError: (error) => {
      setExportProgress(0);
      console.error("Export error:", error);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (workouts: any[]) => {
      setImportProgress(10);
      setImportError(null);
      setImportSuccess(null);

      // Import in batches of 50 to show progress
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < workouts.length; i += batchSize) {
        batches.push(workouts.slice(i, i + batchSize));
      }

      let imported = 0;
      let updated = 0;

      for (let i = 0; i < batches.length; i++) {
        const result = await dbWorkoutsApi.import(batches[i]);
        imported += result.imported;
        updated += result.updated;
        setImportProgress(10 + ((i + 1) / batches.length) * 80);
      }

      setImportProgress(100);

      // Reset progress after a delay
      setTimeout(() => setImportProgress(0), 2000);

      return { imported, updated, total: workouts.length };
    },
    onSuccess: (data) => {
      setImportSuccess(
        `Successfully imported ${data.imported} new workouts and updated ${data.updated} existing workouts.`
      );
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
    onError: (error) => {
      setImportProgress(0);
      setImportError(error instanceof Error ? error.message : "Import failed");
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleImportClick = () => {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const workouts = parseCSVToWorkouts(text);

      if (workouts.length === 0) {
        setImportError("No workouts found in CSV file");
        return;
      }

      await importMutation.mutateAsync(workouts);
    } catch (error) {
      if (error instanceof CSVValidationError) {
        setImportError(error.message);
      } else if (error instanceof Error) {
        setImportError(`Failed to parse CSV: ${error.message}`);
      } else {
        setImportError("Failed to import CSV file");
      }
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, "monke-bar-template.csv");
  };

  return (
    <div className="p-4 space-y-4">
      {isInitialSetup && (
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="text-xl font-bold">Select Your Workout Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the Google Sheet that contains your workout data
          </p>
        </div>
      )}

      {/* User Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {session?.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{session?.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.user.email}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database Mode Toggle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Database Source</CardTitle>
          <CardDescription>
            Choose where to store and fetch your workout data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => onDatabaseModeChange("sheets")}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              databaseMode === "sheets"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary"
            }`}
          >
            <FileSpreadsheet className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Google Sheets</p>
              <p
                className={`text-xs ${
                  databaseMode === "sheets"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                Store data in Google Sheets (legacy)
              </p>
            </div>
            {databaseMode === "sheets" && (
              <Check className="h-5 w-5 shrink-0" />
            )}
          </button>
          <button
            onClick={() => onDatabaseModeChange("postgres")}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              databaseMode === "postgres"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary"
            }`}
          >
            <Database className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Postgres Database</p>
              <p
                className={`text-xs ${
                  databaseMode === "postgres"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                Store data in Postgres (recommended)
              </p>
            </div>
            {databaseMode === "postgres" && (
              <Check className="h-5 w-5 shrink-0" />
            )}
          </button>
        </CardContent>
      </Card>

      {/* Spreadsheet Selection - Only show for Google Sheets mode */}
      {databaseMode === "sheets" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spreadsheet</CardTitle>
            <CardDescription>
              Select your workout tracking spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-4 text-center text-muted-foreground">
                Loading spreadsheets...
              </div>
            ) : spreadsheets && spreadsheets.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {spreadsheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => onSpreadsheetChange(sheet.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      spreadsheetId === sheet.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sheet.name}</p>
                      <p
                        className={`text-xs ${
                          spreadsheetId === sheet.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        Modified{" "}
                        {new Date(sheet.modifiedTime).toLocaleDateString()}
                      </p>
                    </div>
                    {spreadsheetId === sheet.id && (
                      <Check className="h-5 w-5 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No spreadsheets found. Create one in Google Sheets first.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sheet Tab Selection - Only show for Google Sheets mode */}
      {databaseMode === "sheets" && spreadsheetId && sheetInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sheet Tab</CardTitle>
            <CardDescription>
              Select the tab with your workout data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sheetInfo.sheets.map((tab) => (
                <button
                  key={tab.sheetId}
                  type="button"
                  onClick={() => onSheetNameChange(tab.title || "Sheet1")}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer border ${
                    sheetName === tab.title
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-secondary border-border"
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Management - CSV Import/Export - Only show for Postgres mode */}
      {databaseMode === "postgres" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Data Management</CardTitle>
            <CardDescription>
              Import or export your workouts as CSV (Postgres database)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Export Workouts</h3>
              <p className="text-xs text-muted-foreground">
                Download all workouts as CSV
              </p>
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting... {exportProgress}%
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export to CSV
                  </>
                )}
              </Button>
              {exportProgress > 0 && exportProgress < 100 && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Import Workouts</h3>
              <p className="text-xs text-muted-foreground">
                Upload CSV to import. Existing dates will be overwritten.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleImportClick}
                  disabled={importMutation.isPending}
                  className="flex-1"
                  variant="outline"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing... {importProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowTemplateDialog(true)}
                  variant="ghost"
                  size="icon"
                  title="View CSV format"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {importProgress > 0 && importProgress < 100 && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              )}
              {importError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{importError}</p>
                </div>
              )}
              {importSuccess && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{importSuccess}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Format Dialog */}
      {databaseMode === "postgres" && (
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CSV Format Guide</DialogTitle>
              <DialogDescription>
                Use this format to create your own CSV files for import
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Required Columns</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    <code className="bg-secondary px-1 py-0.5 rounded">
                      Date
                    </code>{" "}
                    - Format: YYYY-MM-DD
                  </li>
                  <li>
                    <code className="bg-secondary px-1 py-0.5 rounded">
                      Day
                    </code>{" "}
                    - Day of week
                  </li>
                  <li>
                    <code className="bg-secondary px-1 py-0.5 rounded">
                      Exercise
                    </code>{" "}
                    - Exercise name
                  </li>
                  <li>
                    <code className="bg-secondary px-1 py-0.5 rounded">
                      Warmup
                    </code>{" "}
                    - Format: "70kg, 6" or "7" for bodyweight
                  </li>
                  <li>
                    <code className="bg-secondary px-1 py-0.5 rounded">
                      Set1-Set4
                    </code>{" "}
                    - Same format as Warmup, leave empty if not used
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Example CSV</h4>
                <div className="bg-secondary p-3 rounded-lg overflow-x-auto">
                  <pre className="text-xs">
                    {`Date,Day,Exercise,Warmup,Set1,Set2,Set3,Set4
2025-12-30,Tuesday,Flat Bench Press,,"70kg, 6","70kg, 7","70kg, 6",
2025-12-30,Tuesday,Shoulder Rotate Rope,"5kg, 12","7.5kg, 7","7.5kg, 6","7.5kg, 5",
2026-01-01,Thursday,Chinups,,7,7,5,`}
                  </pre>
                </div>
              </div>
              <Button
                onClick={handleDownloadTemplate}
                className="w-full"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Example Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Continue Button for Initial Setup */}
      {isInitialSetup && spreadsheetId && (
        <Button className="w-full" size="lg">
          Continue to App
        </Button>
      )}
    </div>
  );
}
