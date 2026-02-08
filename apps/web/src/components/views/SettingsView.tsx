import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  Download,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import type { Theme } from "@/hooks/useDarkMode";
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
  restTimerDuration: number;
  onRestTimerDurationChange: (duration: number) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function SettingsView({
  restTimerDuration,
  onRestTimerDurationChange,
  theme,
  onThemeChange,
}: SettingsViewProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

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

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "light" as Theme, icon: Sun, label: "Light" },
              { value: "dark" as Theme, icon: Moon, label: "Dark" },
              { value: "system" as Theme, icon: Monitor, label: "System" },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => onThemeChange(value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                  theme === value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-accent text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management - CSV Import/Export */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data Management</CardTitle>
          <CardDescription>
            Import or export your workouts as CSV
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

      {/* CSV Format Dialog */}
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
                  <code className="bg-secondary px-1 py-0.5 rounded">Date</code>{" "}
                  - Format: YYYY-MM-DD
                </li>
                <li>
                  <code className="bg-secondary px-1 py-0.5 rounded">Day</code>{" "}
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

      {/* Rest Timer Settings */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <CardTitle className="text-base">Rest Timer</CardTitle>
          </div>
          <CardDescription>
            Default countdown duration between sets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Minutes</label>
              <Input
                type="number"
                min="0"
                max="10"
                value={Math.floor(restTimerDuration / 60)}
                onChange={(e) => {
                  const minutes = parseInt(e.target.value) || 0;
                  const seconds = restTimerDuration % 60;
                  onRestTimerDurationChange(minutes * 60 + seconds);
                }}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Seconds</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={restTimerDuration % 60}
                onChange={(e) => {
                  const seconds = parseInt(e.target.value) || 0;
                  const minutes = Math.floor(restTimerDuration / 60);
                  onRestTimerDurationChange(minutes * 60 + seconds);
                }}
              />
            </div>
            <div className="pt-6">
              <span className="text-2xl font-mono font-bold text-muted-foreground">
                {Math.floor(restTimerDuration / 60)}:
                {(restTimerDuration % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
