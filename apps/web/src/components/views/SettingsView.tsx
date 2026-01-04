import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogOut, Check, FileSpreadsheet } from "lucide-react";

interface SettingsViewProps {
  spreadsheetId: string | null;
  sheetName: string;
  onSpreadsheetChange: (id: string | null) => void;
  onSheetNameChange: (name: string) => void;
  isInitialSetup?: boolean;
}

export function SettingsView({
  spreadsheetId,
  sheetName,
  onSpreadsheetChange,
  onSheetNameChange,
  isInitialSetup = false,
}: SettingsViewProps) {
  const { data: session } = useSession();

  // Fetch user's spreadsheets
  const { data: spreadsheets, isLoading } = useQuery({
    queryKey: ["spreadsheets"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3001/api/sheets/spreadsheets", {
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
      const res = await fetch(
        `http://localhost:3001/api/sheets/info?spreadsheetId=${spreadsheetId}`,
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

      {/* Spreadsheet Selection */}
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

      {/* Sheet Tab Selection */}
      {spreadsheetId && sheetInfo && (
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

      {/* Continue Button for Initial Setup */}
      {isInitialSetup && spreadsheetId && (
        <Button className="w-full" size="lg">
          Continue to App
        </Button>
      )}
    </div>
  );
}
