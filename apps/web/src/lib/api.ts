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
  groupId?: string; // ID for linking superset exercises (e.g., "SS1")
  groupType?: "superset"; // Type of grouping
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

// Analytics API
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

// Exercise Master API
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

// Database Workouts API
export const dbWorkoutsApi = {
  // Get all workouts from database
  getAll: () => fetchApi<Workout[]>("/workouts/db"),

  // Import workouts to database (bulk create/update)
  import: (workouts: Workout[]) =>
    fetchApi<{ imported: number; updated: number; total: number }>(
      "/workouts/db",
      {
        method: "POST",
        body: JSON.stringify({ workouts }),
      }
    ),

  // Add workout entries to database
  addEntries: (entries: WorkoutLogEntry[]) =>
    fetchApi<{ entriesAdded: number }>("/workouts/db/entries", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),

  // Delete an exercise from a workout
  deleteExercise: (date: string, exerciseId: string) =>
    fetchApi<{ message: string }>(
      `/workouts/db/${date}/exercise/${exerciseId}`,
      {
        method: "DELETE",
      }
    ),

  // Delete all workouts from database
  deleteAll: () =>
    fetchApi<{ message: string }>("/workouts/db", {
      method: "DELETE",
    }),
};
