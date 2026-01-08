import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createWorkoutsApi,
  createAnalyticsApi,
  createSheetsApi,
  createWorkoutLogApi,
  dbWorkoutsApi,
} from "@/lib/api";
import { toast } from "sonner";
import { useMemo } from "react";

// Utility functions for date calculations
function getWeekNumber(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  if (!d || isNaN(d.getTime())) {
    console.error("Invalid date:", date);
    return 1;
  }
  const utcDate = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function getYear(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  if (!d || isNaN(d.getTime())) {
    console.error("Invalid date:", date);
    return new Date().getFullYear();
  }
  return d.getFullYear();
}

// Helper hook to create memoized API clients
function useApiClients(spreadsheetId: string, sheetName: string) {
  return useMemo(
    () => ({
      workouts: createWorkoutsApi(spreadsheetId, sheetName),
      analytics: createAnalyticsApi(spreadsheetId, sheetName),
      sheets: createSheetsApi(spreadsheetId, sheetName),
      workoutLog: createWorkoutLogApi(spreadsheetId, sheetName),
    }),
    [spreadsheetId, sheetName]
  );
}

// Workouts hooks
export function useWorkouts(
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["workouts", databaseMode, spreadsheetId, sheetName],
    queryFn:
      databaseMode === "postgres" ? dbWorkoutsApi.getAll : workouts.getAll,
    enabled: databaseMode === "postgres" || !!spreadsheetId,
  });
}

export function useLatestWorkout(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["workouts", "latest", spreadsheetId, sheetName],
    queryFn: workouts.getLatest,
    enabled: !!spreadsheetId,
  });
}

export function useWorkoutByDate(
  date: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: [
      "workouts",
      "date",
      date,
      databaseMode,
      spreadsheetId,
      sheetName,
    ],
    queryFn: async () => {
      if (databaseMode === "postgres") {
        const allWorkouts = await dbWorkoutsApi.getAll();
        return allWorkouts.find((w) => w.date === date) || null;
      }
      return workouts.getByDate(date);
    },
    enabled: !!date && (databaseMode === "postgres" || !!spreadsheetId),
  });
}

export function useExerciseList(
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["exercises", databaseMode, spreadsheetId, sheetName],
    queryFn: async () => {
      if (databaseMode === "postgres") {
        const allWorkouts = await dbWorkoutsApi.getAll();
        const exerciseSet = new Set<string>();
        allWorkouts.forEach((workout) => {
          workout.exercises.forEach((exercise) => {
            exerciseSet.add(exercise.name);
          });
        });
        return Array.from(exerciseSet).sort();
      }
      return workouts.getExercises();
    },
    enabled: databaseMode === "postgres" || !!spreadsheetId,
  });
}

export function useExerciseHistory(
  name: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["exercise", name, "history", spreadsheetId, sheetName],
    queryFn: () => workouts.getExerciseHistory(name),
    enabled: !!name && !!spreadsheetId,
  });
}

// Analytics hooks
export function useBestSets(
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  days = 30,
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: [
      "analytics",
      "bestSets",
      days,
      databaseMode,
      spreadsheetId,
      sheetName,
    ],
    queryFn: async () => {
      if (databaseMode === "postgres") {
        const workouts = await dbWorkoutsApi.getAll();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const exerciseBestMap = new Map<string, any>();

        workouts.forEach((workout) => {
          if (new Date(workout.date) >= cutoffDate) {
            workout.exercises.forEach((exercise) => {
              exercise.sets.forEach((set) => {
                if (!set.isWarmup) {
                  const volume = set.weight * set.reps;
                  const key = exercise.name;
                  const current = exerciseBestMap.get(key);

                  if (!current || volume > current.volume) {
                    exerciseBestMap.set(key, {
                      exerciseName: exercise.name,
                      weight: set.weight,
                      reps: set.reps,
                      volume,
                      date: workout.date,
                    });
                  }
                }
              });
            });
          }
        });

        return Array.from(exerciseBestMap.values());
      }
      return analytics.getBestSets(days);
    },
    enabled: databaseMode === "postgres" || !!spreadsheetId,
  });
}

export function useExerciseTrends(
  name: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: [
      "analytics",
      "trends",
      name,
      databaseMode,
      spreadsheetId,
      sheetName,
    ],
    queryFn: () => analytics.getExerciseTrends(name),
    enabled: !!name && (databaseMode === "postgres" || !!spreadsheetId),
  });
}

export function useExerciseStats(
  name: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: [
      "analytics",
      "stats",
      name,
      databaseMode,
      spreadsheetId,
      sheetName,
    ],
    queryFn: () => analytics.getExerciseStats(name),
    enabled: !!name && (databaseMode === "postgres" || !!spreadsheetId),
  });
}

export function useVolumeHistory(
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: [
      "analytics",
      "volumeHistory",
      databaseMode,
      spreadsheetId,
      sheetName,
    ],
    queryFn: async () => {
      if (databaseMode === "postgres") {
        const workouts = await dbWorkoutsApi.getAll();
        const volumeByWeek = new Map<string, number>();

        workouts.forEach((workout) => {
          const week = getWeekNumber(workout.date);
          const year = getYear(workout.date);
          const key = `${year}-W${week}`;

          let weekVolume = volumeByWeek.get(key) || 0;

          workout.exercises.forEach((exercise) => {
            exercise.sets.forEach((set) => {
              if (!set.isWarmup) {
                weekVolume += set.weight * set.reps;
              }
            });
          });

          volumeByWeek.set(key, weekVolume);
        });

        return Array.from(volumeByWeek.entries())
          .map(([week, totalVolume]) => ({ week, totalVolume }))
          .sort((a, b) => a.week.localeCompare(b.week));
      }
      return analytics.getVolumeHistory();
    },
    enabled: databaseMode === "postgres" || !!spreadsheetId,
  });
}

export function useSummary(
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  databaseMode: "sheets" | "postgres" = "sheets"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["analytics", "summary", databaseMode, spreadsheetId, sheetName],
    queryFn: async () => {
      if (databaseMode === "postgres") {
        const workouts = await dbWorkoutsApi.getAll();
        const exerciseSet = new Set<string>();
        let totalSets = 0;
        let totalVolume = 0;

        workouts.forEach((workout) => {
          workout.exercises.forEach((exercise) => {
            exerciseSet.add(exercise.name);
            exercise.sets.forEach((set) => {
              if (!set.isWarmup) {
                totalSets++;
                totalVolume += set.weight * set.reps;
              }
            });
          });
        });

        return {
          totalWeeks: new Set(
            workouts.map((w) => {
              return `${getYear(w.date)}-W${getWeekNumber(w.date)}`;
            })
          ).size,
          totalSessions: workouts.length,
          totalSets,
          totalVolume,
          uniqueExercises: exerciseSet.size,
          exerciseList: Array.from(exerciseSet).sort(),
        };
      }
      return analytics.getSummary();
    },
    enabled: databaseMode === "postgres" || !!spreadsheetId,
  });
}

// Sync hooks
export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: () =>
      fetch("/api/sheets/status", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => data.data),
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useSync(spreadsheetId: string, sheetName: string = "Sheet1") {
  const queryClient = useQueryClient();
  const { sheets } = useApiClients(spreadsheetId, sheetName);

  return useMutation({
    mutationFn: sheets.sync,
    onSuccess: () => {
      // Invalidate all workout-related queries
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["sync"] });
      toast.success("Synced with Google Sheets");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}

export function useUpdateCell(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const queryClient = useQueryClient();
  const { sheets } = useApiClients(spreadsheetId, sheetName);

  return useMutation({
    mutationFn: ({
      row,
      col,
      weight,
      reps,
    }: {
      row: number;
      col: string;
      weight: number;
      reps: number;
    }) => sheets.updateCell(row, col, weight, reps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Set updated");
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

// Workout Log hooks (for the normalized format)
export function useWorkoutLogData(spreadsheetId: string, sheetName: string) {
  const { workoutLog } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["workout-log", spreadsheetId, sheetName],
    queryFn: () => workoutLog.sync(),
    enabled: !!spreadsheetId && !!sheetName,
  });
}

export function useWorkoutLogSync(spreadsheetId: string, sheetName: string) {
  const queryClient = useQueryClient();
  const { workoutLog } = useApiClients(spreadsheetId, sheetName);

  return useMutation({
    mutationFn: () => workoutLog.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-log"] });
      toast.success("Synced workout log");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}

export function useAddWorkoutEntries(spreadsheetId: string, sheetName: string) {
  const queryClient = useQueryClient();
  const { workoutLog } = useApiClients(spreadsheetId, sheetName);

  return useMutation({
    mutationFn: workoutLog.addEntries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-log"] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Workout saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}
