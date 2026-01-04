import { RefreshCw, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useSync, useSyncStatus } from "@/hooks/useWorkouts";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
  spreadsheetId: string;
  sheetName: string;
  onSettingsClick: () => void;
}

export function Header({
  spreadsheetId,
  sheetName,
  onSettingsClick,
}: HeaderProps) {
  const { data: syncStatus } = useSyncStatus();
  const syncMutation = useSync(spreadsheetId, sheetName);

  const lastSynced = syncStatus?.lastSyncedAt
    ? formatDistanceToNow(new Date(syncStatus.lastSyncedAt), {
        addSuffix: true,
      })
    : null;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-xl font-bold">🦍 Monkebar</h1>
          {lastSynced && (
            <p className="text-xs text-muted-foreground">Synced {lastSynced}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !spreadsheetId}
          >
            <RefreshCw
              className={`h-5 w-5 ${
                syncMutation.isPending ? "animate-spin" : ""
              }`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
