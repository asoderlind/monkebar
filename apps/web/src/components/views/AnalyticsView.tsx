import { useState } from "react";
import {
  useBestSets,
  useSummary,
  useVolumeHistory,
  useExerciseStats,
} from "@/hooks/useWorkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Trophy, TrendingUp, Dumbbell, ChevronDown } from "lucide-react";

interface AnalyticsViewProps {
  spreadsheetId: string;
  sheetName: string;
}

export function AnalyticsView({
  spreadsheetId,
  sheetName,
}: AnalyticsViewProps) {
  const { data: bestSets, isLoading: loadingBestSets } = useBestSets(
    spreadsheetId,
    sheetName,
    4
  );
  const { data: summary, isLoading: loadingSummary } = useSummary(
    spreadsheetId,
    sheetName
  );
  const { data: volumeHistory } = useVolumeHistory(spreadsheetId, sheetName);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const { data: exerciseStats } = useExerciseStats(
    selectedExercise || "",
    spreadsheetId,
    sheetName
  );

  if (loadingBestSets || loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading analytics...
        </div>
      </div>
    );
  }

  // Prepare volume chart data - group by week
  const weeklyVolume =
    volumeHistory?.reduce((acc, item) => {
      const key = `Week ${item.weekNumber}`;
      if (!acc[key]) {
        acc[key] = { week: key, volume: 0 };
      }
      acc[key].volume += item.totalVolume;
      return acc;
    }, {} as Record<string, { week: string; volume: number }>) || {};

  const volumeChartData = Object.values(weeklyVolume).slice(-8);

  return (
    <div className="p-4 space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Dumbbell className="h-4 w-4" />
              <span className="text-xs">Total Sets</span>
            </div>
            <p className="text-2xl font-bold">{summary?.totalSets || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Volume (kg)</span>
            </div>
            <p className="text-2xl font-bold">
              {summary?.totalVolume
                ? Math.round(summary.totalVolume).toLocaleString()
                : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-xs">Exercises</span>
            </div>
            <p className="text-2xl font-bold">
              {summary?.uniqueExercises || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs">📅</span>
              <span className="text-xs">Weeks Tracked</span>
            </div>
            <p className="text-2xl font-bold">{summary?.totalWeeks || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      {volumeChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.replace("Week ", "W")}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${Math.round(value).toLocaleString()} kg`,
                      "Volume",
                    ]}
                  />
                  <Bar
                    dataKey="volume"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Sets (Last 4 Weeks) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Best Sets (Last 4 Weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestSets && bestSets.length > 0 ? (
            <div className="space-y-2">
              {bestSets.slice(0, 10).map((best, idx) => (
                <button
                  key={best.exerciseName}
                  onClick={() =>
                    setSelectedExercise(
                      selectedExercise === best.exerciseName
                        ? null
                        : best.exerciseName
                    )
                  }
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{best.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        Week {best.weekNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {best.weight}kg × {best.reps}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {best.volume.toLocaleString()} vol
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exercise Detail Modal/Expansion */}
      {selectedExercise && exerciseStats && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{selectedExercise}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedExercise(null)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PR vs Recent */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  All-Time PR
                </p>
                <p className="font-bold">
                  {exerciseStats.currentPR.weight}kg ×{" "}
                  {exerciseStats.currentPR.reps}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Last 4 Weeks
                </p>
                <p className="font-bold">
                  {exerciseStats.last30DaysBest?.weight || 0}kg ×{" "}
                  {exerciseStats.last30DaysBest?.reps || 0}
                </p>
              </div>
            </div>

            {/* Trend Chart */}
            {exerciseStats.trend.length > 1 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exerciseStats.trend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="weekNumber"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `W${value}`}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Max Weight"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {exerciseStats.totalSessions} sessions tracked
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
