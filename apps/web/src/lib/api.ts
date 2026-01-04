import type {
  ApiResponse,
  WorkoutWeek,
  BestSet,
  ExerciseStats,
  VolumeHistory,
} from "@monke-bar/shared";

const API_BASE = "http://localhost:3001/api";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...options,
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data.data as T;
}

function buildSheetParams(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
): string {
  return `spreadsheetId=${encodeURIComponent(
    spreadsheetId
  )}&sheetName=${encodeURIComponent(sheetName)}`;
}

// Factory functions for creating API methods with sheet params
export function createWorkoutsApi(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const params = buildSheetParams(spreadsheetId, sheetName);

  return {
    getAll: () => fetchApi<WorkoutWeek[]>(`/workouts?${params}`),
    getWeek: (weekNumber: number) =>
      fetchApi<WorkoutWeek>(`/workouts/week/${weekNumber}?${params}`),
    getLatest: () => fetchApi<WorkoutWeek | null>(`/workouts/latest?${params}`),
    getExercises: () => fetchApi<string[]>(`/workouts/exercises?${params}`),
    getExerciseHistory: (name: string) =>
      fetchApi<{
        exerciseName: string;
        history: Array<{
          weekNumber: number;
          dayOfWeek: string;
          sets: Array<{
            weight: number;
            reps: number;
            isWarmup: boolean;
            setNumber: number;
          }>;
        }>;
      }>(`/workouts/exercise/${encodeURIComponent(name)}?${params}`),
  };
}

export function createAnalyticsApi(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const params = buildSheetParams(spreadsheetId, sheetName);

  return {
    getBestSets: (weeks = 4) =>
      fetchApi<BestSet[]>(`/analytics/best-sets?${params}&weeks=${weeks}`),
    getExerciseTrends: (name: string) =>
      fetchApi<{
        exerciseName: string;
        trends: Array<{
          date: string;
          weekNumber: number;
          maxWeight: number;
          totalVolume: number;
          totalReps: number;
          averageWeight: number;
        }>;
      }>(`/analytics/exercise/${encodeURIComponent(name)}/trends?${params}`),
    getExerciseStats: (name: string) =>
      fetchApi<ExerciseStats>(
        `/analytics/exercise/${encodeURIComponent(name)}/stats?${params}`
      ),
    getVolumeHistory: () =>
      fetchApi<VolumeHistory[]>(`/analytics/volume-history?${params}`),
    getSummary: () =>
      fetchApi<{
        totalWeeks: number;
        totalSessions: number;
        totalSets: number;
        totalVolume: number;
        uniqueExercises: number;
        exerciseList: string[];
      }>(`/analytics/summary?${params}`),
  };
}

export function createSheetsApi(
  spreadsheetId: string,
  sheetName: string = "Sheet1"
) {
  const params = buildSheetParams(spreadsheetId, sheetName);

  return {
    sync: () =>
      fetchApi<{
        weeks: WorkoutWeek[];
        syncedAt: string;
      }>(`/sheets/sync?${params}`),
    getStatus: () =>
      fetchApi<{
        lastSyncedAt: string | null;
        isSyncing: boolean;
        error?: string;
      }>("/sheets/status"),
    updateCell: (row: number, col: string, weight: number, reps: number) =>
      fetchApi<{ row: number; col: string; value: string }>(
        "/sheets/update-cell",
        {
          method: "POST",
          body: JSON.stringify({
            spreadsheetId,
            sheetName,
            row,
            col,
            weight,
            reps,
          }),
        }
      ),
  };
}

// Legacy API objects (kept for backwards compatibility)
export const workoutsApi = {
  getAll: () => fetchApi<WorkoutWeek[]>("/workouts"),
  getWeek: (weekNumber: number) =>
    fetchApi<WorkoutWeek>(`/workouts/week/${weekNumber}`),
  getLatest: () => fetchApi<WorkoutWeek | null>("/workouts/latest"),
  getExercises: () => fetchApi<string[]>("/workouts/exercises"),
  getExerciseHistory: (name: string) =>
    fetchApi<{
      exerciseName: string;
      history: Array<{
        weekNumber: number;
        dayOfWeek: string;
        sets: Array<{
          weight: number;
          reps: number;
          isWarmup: boolean;
          setNumber: number;
        }>;
      }>;
    }>(`/workouts/exercise/${encodeURIComponent(name)}`),
};

export const analyticsApi = {
  getBestSets: (weeks = 4) =>
    fetchApi<BestSet[]>(`/analytics/best-sets?weeks=${weeks}`),
  getExerciseTrends: (name: string) =>
    fetchApi<{
      exerciseName: string;
      trends: Array<{
        date: string;
        weekNumber: number;
        maxWeight: number;
        totalVolume: number;
        totalReps: number;
        averageWeight: number;
      }>;
    }>(`/analytics/exercise/${encodeURIComponent(name)}/trends`),
  getExerciseStats: (name: string) =>
    fetchApi<ExerciseStats>(
      `/analytics/exercise/${encodeURIComponent(name)}/stats`
    ),
  getVolumeHistory: () =>
    fetchApi<VolumeHistory[]>("/analytics/volume-history"),
  getSummary: () =>
    fetchApi<{
      totalWeeks: number;
      totalSessions: number;
      totalSets: number;
      totalVolume: number;
      uniqueExercises: number;
      exerciseList: string[];
    }>("/analytics/summary"),
};

export const sheetsApi = {
  sync: () =>
    fetchApi<{
      weeks: WorkoutWeek[];
      syncedAt: string;
    }>("/sheets/sync"),
  getStatus: () =>
    fetchApi<{
      lastSyncedAt: string | null;
      isSyncing: boolean;
      error?: string;
    }>("/sheets/status"),
  updateCell: (row: number, col: string, weight: number, reps: number) =>
    fetchApi<{ row: number; col: string; value: string }>(
      "/sheets/update-cell",
      {
        method: "POST",
        body: JSON.stringify({ row, col, weight, reps }),
      }
    ),
};
