import { useState, useMemo } from "react";
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

// Muscle group colors - defined here to ensure Tailwind picks them up
const getMuscleGroupColor = (muscleGroup: string): string => {
  switch (muscleGroup) {
    case "Chest":
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case "Triceps":
      return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
    case "Shoulders":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    case "Biceps":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "Back":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    case "Legs":
      return "bg-purple-500/20 text-purple-700 dark:text-purple-400";
    case "Core":
      return "bg-pink-500/20 text-pink-700 dark:text-pink-400";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  }
};

// Muscle group chart colors for recharts
const getMuscleGroupChartColor = (muscleGroup: string): string => {
  switch (muscleGroup) {
    case "Chest":
      return "#ef4444";
    case "Triceps":
      return "#f97316";
    case "Shoulders":
      return "#eab308";
    case "Biceps":
      return "#22c55e";
    case "Back":
      return "#3b82f6";
    case "Legs":
      return "#a855f7";
    case "Core":
      return "#ec4899";
    default:
      return "#6b7280";
  }
};

export function AnalyticsView() {
  const { data: bestSets, isLoading: loadingBestSets } = useBestSets(30);
  const { data: summary, isLoading: loadingSummary } = useSummary();
  const { data: volumeHistory } = useVolumeHistory();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const { data: exerciseStats } = useExerciseStats(selectedExercise || "");

  // Group best sets by muscle group
  const groupedBestSets = useMemo(() => {
    if (!bestSets) return {};

    const groups: Record<string, typeof bestSets> = {};
    bestSets.forEach((set) => {
      const muscleGroup = set.muscleGroup || "Other";
      if (!groups[muscleGroup]) {
        groups[muscleGroup] = [];
      }
      groups[muscleGroup].push(set);
    });

    // Sort each group by weight descending
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    });

    return groups;
  }, [bestSets]);

  // Prepare volume chart data - data is already grouped by week from API
  const volumeChartData = useMemo(() => {
    if (!volumeHistory || volumeHistory.length === 0) {
      return { data: [], muscleGroups: [], hasMuscleGroupData: false };
    }

    const sorted = volumeHistory
      .map((item) => {
        const [year, weekNum] = item.week.split("-W");
        return {
          week: `W${weekNum}`,
          year: parseInt(year),
          weekNumber: parseInt(weekNum),
          volume: item.totalVolume,
          muscleGroups: item.muscleGroups || {},
        };
      })
      .sort((a, b) => a.year - b.year || a.weekNumber - b.weekNumber)
      .slice(-8); // Show last 8 weeks

    // Get all unique muscle groups across all weeks
    const muscleGroupSet = new Set<string>();
    sorted.forEach((item) => {
      if (item.muscleGroups && Object.keys(item.muscleGroups).length > 0) {
        Object.keys(item.muscleGroups).forEach((mg) => muscleGroupSet.add(mg));
      }
    });
    const muscleGroups = Array.from(muscleGroupSet).sort();
    const hasMuscleGroupData = muscleGroups.length > 0;

    // Transform data to include muscle group volumes as separate keys
    const data = sorted.map((item) => {
      const transformed: any = {
        week: item.week,
        year: item.year,
        weekNumber: item.weekNumber,
        volume: item.volume, // Keep total volume for fallback
      };
      if (hasMuscleGroupData) {
        muscleGroups.forEach((mg) => {
          transformed[mg] = (item.muscleGroups && item.muscleGroups[mg]) || 0;
        });
      }
      return transformed;
    });

    return { data, muscleGroups, hasMuscleGroupData };
  }, [volumeHistory]);

  if (loadingBestSets || loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading analytics...
        </div>
      </div>
    );
  }

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
              <span className="text-xs">Workouts</span>
            </div>
            <p className="text-2xl font-bold">{summary?.totalSessions || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      {volumeChartData.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {volumeChartData.hasMuscleGroupData
                ? "Weekly Volume by Muscle Group"
                : "Weekly Volume"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData.data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${Math.round(value).toLocaleString()} kg`,
                      name,
                    ]}
                  />
                  {volumeChartData.hasMuscleGroupData ? (
                    // Stacked bar chart with muscle groups
                    volumeChartData.muscleGroups.map((muscleGroup) => (
                      <Bar
                        key={muscleGroup}
                        dataKey={muscleGroup}
                        stackId="volume"
                        fill={getMuscleGroupChartColor(muscleGroup)}
                      />
                    ))
                  ) : (
                    // Fallback: simple bar chart with total volume
                    <Bar
                      dataKey="volume"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Sets (PR) - Grouped by Muscle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Best Sets (PR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestSets && bestSets.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedBestSets).map(([muscleGroup, sets]) => (
                <div key={muscleGroup}>
                  {/* Muscle Group Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${getMuscleGroupColor(
                        muscleGroup
                      )}`}
                    >
                      {muscleGroup}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Exercises in this muscle group */}
                  <div className="space-y-2">
                    {sets.map((best) => (
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
                          <div>
                            <p className="font-medium text-sm">
                              {best.exerciseName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {best.date}
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
                </div>
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
