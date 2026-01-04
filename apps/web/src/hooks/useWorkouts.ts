import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createWorkoutsApi,
  createAnalyticsApi,
  createSheetsApi,
  createWorkoutLogApi,
} from "@/lib/api";
import { toast } from "sonner";
import { useMemo } from "react";

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
  sheetName: string = "Sheet1"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["workouts", spreadsheetId, sheetName],
    queryFn: workouts.getAll,
    enabled: !!spreadsheetId,
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
  sheetName: string = "Sheet1"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["workouts", "date", date, spreadsheetId, sheetName],
    queryFn: () => workouts.getByDate(date),
    enabled: !!date && !!spreadsheetId,
  });
}

export function useExerciseList(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { workouts } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["exercises", spreadsheetId, sheetName],
    queryFn: workouts.getExercises,
    enabled: !!spreadsheetId,
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
  days = 30
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["analytics", "bestSets", days, spreadsheetId, sheetName],
    queryFn: () => analytics.getBestSets(days),
    enabled: !!spreadsheetId,
  });
}

export function useExerciseTrends(
  name: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["analytics", "trends", name, spreadsheetId, sheetName],
    queryFn: () => analytics.getExerciseTrends(name),
    enabled: !!name && !!spreadsheetId,
  });
}

export function useExerciseStats(
  name: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["analytics", "stats", name, spreadsheetId, sheetName],
    queryFn: () => analytics.getExerciseStats(name),
    enabled: !!name && !!spreadsheetId,
  });
}

export function useVolumeHistory(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["analytics", "volumeHistory", spreadsheetId, sheetName],
    queryFn: analytics.getVolumeHistory,
    enabled: !!spreadsheetId,
  });
}

export function useSummary(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const { analytics } = useApiClients(spreadsheetId, sheetName);

  return useQuery({
    queryKey: ["analytics", "summary", spreadsheetId, sheetName],
    queryFn: analytics.getSummary,
    enabled: !!spreadsheetId,
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
      toast.success("Workout saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}
