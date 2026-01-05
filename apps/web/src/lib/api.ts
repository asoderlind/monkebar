import type {
  ApiResponse,
  Workout,
  BestSet,
  ExerciseStats,
  VolumeHistory,
  DayOfWeek,
  ExerciseMaster,
  NewExerciseMaster,
} from "@monke-bar/shared";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Workout log entry type for adding new workouts
export interface WorkoutLogEntry {
  date: string; // YYYY-MM-DD
  day: DayOfWeek;
  exercise: string;
  warmup?: { weight: number; reps: number };
  sets: Array<{ weight: number; reps: number }>;
}

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
    getAll: () => fetchApi<Workout[]>(`/workouts?${params}`),
    getByDate: (date: string) =>
      fetchApi<Workout | null>(`/workouts/date/${date}?${params}`),
    getLatest: () => fetchApi<Workout | null>(`/workouts/latest?${params}`),
    getExercises: () => fetchApi<string[]>(`/workouts/exercises?${params}`),
    getExerciseHistory: (name: string) =>
      fetchApi<{
        exerciseName: string;
        history: Array<{
          date: string;
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
    getBestSets: (days = 30) =>
      fetchApi<BestSet[]>(`/analytics/best-sets?${params}&days=${days}`),
    getExerciseTrends: (name: string) =>
      fetchApi<{
        exerciseName: string;
        trends: Array<{
          date: string;
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
        workouts: Workout[];
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

// Workout Log API for the new normalized sheet structure
export function createWorkoutLogApi(
  spreadsheetId: string,
  sheetName: string = "Workout Log"
) {
  const params = buildSheetParams(spreadsheetId, sheetName);

  return {
    // Check if workout log sheet exists
    check: () =>
      fetchApi<{ exists: boolean; sheetName: string }>(
        `/sheets/workout-log/check?${params}`
      ),
    // Create the workout log sheet
    create: () =>
      fetchApi<{ sheetName: string; created: boolean; message?: string }>(
        "/sheets/workout-log/create",
        {
          method: "POST",
          body: JSON.stringify({ spreadsheetId, sheetName }),
        }
      ),
    // Add workout entries
    addEntries: (entries: WorkoutLogEntry[]) =>
      fetchApi<{ entriesAdded: number }>("/sheets/workout-log/entries", {
        method: "POST",
        body: JSON.stringify({ spreadsheetId, sheetName, entries }),
      }),
    // Sync workout log data
    sync: () =>
      fetchApi<{ workouts: Workout[]; syncedAt: string }>(
        `/sheets/workout-log/sync?${params}`
      ),
  };
}

// Legacy API objects (kept for backwards compatibility)
export const workoutsApi = {
  getAll: () => fetchApi<Workout[]>("/workouts"),
  getByDate: (date: string) => fetchApi<Workout>(`/workouts/date/${date}`),
  getLatest: () => fetchApi<Workout | null>("/workouts/latest"),
  getExercises: () => fetchApi<string[]>("/workouts/exercises"),
  getExerciseHistory: (name: string) =>
    fetchApi<{
      exerciseName: string;
      history: Array<{
        date: string;
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
  getBestSets: (days = 30) =>
    fetchApi<BestSet[]>(`/analytics/best-sets?days=${days}`),
  getExerciseTrends: (name: string) =>
    fetchApi<{
      exerciseName: string;
      trends: Array<{
        date: string;
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
      totalWorkouts: number;
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
      workouts: Workout[];
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

export const exercisesApi = {
  getAll: () => fetchApi<ExerciseMaster[]>("/exercises"),
  getById: (id: number) => fetchApi<ExerciseMaster>(`/exercises/${id}`),
  create: (data: NewExerciseMaster) =>
    fetchApi<ExerciseMaster>("/exercises", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<NewExerciseMaster>) =>
    fetchApi<ExerciseMaster>(`/exercises/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ message: string }>(`/exercises/${id}`, {
      method: "DELETE",
    }),
};
