// Shared types for the workout tracker app

// ============================================================================
// Core Data Types - Matching Google Sheets structure
// ============================================================================

/**
 * Represents a single set of an exercise
 * Cell format in sheet: "70kg, 3" -> { weight: 70, reps: 3 }
 */
export interface WorkoutSet {
  weight: number; // in kg
  reps: number;
  isWarmup: boolean;
  setNumber: number; // 0 = warmup, 1-4 = working sets
}

/**
 * A single exercise with its sets for a given day
 * Rows in the sheet: Exercise name + Warmup + Set 1-4
 */
export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

/**
 * Day of the week for workouts
 */
export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

/**
 * A workout day containing all exercises for that day
 * Columns in the sheet: Monday (B-G), Tuesday (H-M), etc.
 */
export interface WorkoutDay {
  dayOfWeek: DayOfWeek;
  exercises: Exercise[];
  date?: string; // ISO date string when known
}

/**
 * A full week of workouts
 * Rows grouped by "Week" column (A) in the sheet
 */
export interface WorkoutWeek {
  weekNumber: number;
  startDate?: string; // ISO date string
  days: WorkoutDay[];
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Best set record for an exercise
 */
export interface BestSet {
  exerciseName: string;
  weight: number;
  reps: number;
  volume: number; // weight * reps
  date: string;
  weekNumber: number;
}

/**
 * Exercise trend data point for charts
 */
export interface TrendDataPoint {
  date: string;
  weekNumber: number;
  maxWeight: number;
  totalVolume: number; // sum of (weight * reps) for all sets
  totalReps: number;
  averageWeight: number;
}

/**
 * Exercise statistics summary
 */
export interface ExerciseStats {
  exerciseName: string;
  currentPR: BestSet;
  last30DaysBest: BestSet | null;
  trend: TrendDataPoint[];
  totalSessions: number;
}

/**
 * Volume history for overall progress tracking
 */
export interface VolumeHistory {
  date: string;
  weekNumber: number;
  dayOfWeek: DayOfWeek;
  totalVolume: number;
  exerciseCount: number;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Response wrapper for API calls
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sync status for Google Sheets
 */
export interface SyncStatus {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  error?: string;
}

/**
 * Sheet configuration
 */
export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Parse result for a cell value like "70kg, 3"
 */
export type ParsedSetValue = {
  weight: number;
  reps: number;
} | null;

/**
 * Column mapping for days in the sheet
 */
export interface DayColumnMapping {
  day: DayOfWeek;
  exerciseCol: string; // e.g., "B" for Monday
  warmupCol: string; // e.g., "C"
  set1Col: string; // e.g., "D"
  set2Col: string; // e.g., "E"
  set3Col: string; // e.g., "F"
  set4Col: string; // e.g., "G"
}

// ============================================================================
// Constants
// ============================================================================

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Muscle groups
 */
export type MuscleGroup =
  | "Chest"
  | "Triceps"
  | "Shoulders"
  | "Biceps"
  | "Back"
  | "Legs"
  | "Core";

/**
 * Exercise to muscle group mapping
 */
export const EXERCISE_MUSCLE_GROUPS: Record<string, MuscleGroup> = {
  "Flat Bench Press": "Chest",
  "SH Triceps Rope Push": "Triceps",
  "Shoulder Rotate Rope": "Shoulders",
  "Rope SH Fly": "Shoulders",
  "Rope Curls": "Biceps",
  Chinups: "Back",
  "Rope Face Pulls": "Back",
  "Row Machine SH": "Back",
  "Dumbell Shoulder Press": "Shoulders",
  "Incline Smith Bench Press": "Chest",
  "Yoga Ball Crunches": "Core",
};

/**
 * Get muscle group for an exercise (case-insensitive partial match)
 */
export function getMuscleGroup(exerciseName: string): MuscleGroup | undefined {
  // First try exact match
  if (EXERCISE_MUSCLE_GROUPS[exerciseName]) {
    return EXERCISE_MUSCLE_GROUPS[exerciseName];
  }
  // Then try case-insensitive partial match
  const lowerName = exerciseName.toLowerCase();
  for (const [exercise, group] of Object.entries(EXERCISE_MUSCLE_GROUPS)) {
    if (
      lowerName.includes(exercise.toLowerCase()) ||
      exercise.toLowerCase().includes(lowerName)
    ) {
      return group;
    }
  }
  return undefined;
}

/**
 * Muscle group colors for UI
 */
export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  Chest: "bg-red-500/20 text-red-700 dark:text-red-400",
  Triceps: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  Shoulders: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  Biceps: "bg-green-500/20 text-green-700 dark:text-green-400",
  Back: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  Legs: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  Core: "bg-pink-500/20 text-pink-700 dark:text-pink-400",
};

/**
 * Default column mapping based on the sheet structure shown in the image
 * Monday: B-G, Tuesday: H-M, etc.
 */
export const DEFAULT_DAY_COLUMNS: DayColumnMapping[] = [
  {
    day: "Monday",
    exerciseCol: "B",
    warmupCol: "C",
    set1Col: "D",
    set2Col: "E",
    set3Col: "F",
    set4Col: "G",
  },
  {
    day: "Tuesday",
    exerciseCol: "H",
    warmupCol: "I",
    set1Col: "J",
    set2Col: "K",
    set3Col: "L",
    set4Col: "M",
  },
  {
    day: "Wednesday",
    exerciseCol: "N",
    warmupCol: "O",
    set1Col: "P",
    set2Col: "Q",
    set3Col: "R",
    set4Col: "S",
  },
  {
    day: "Thursday",
    exerciseCol: "T",
    warmupCol: "U",
    set1Col: "V",
    set2Col: "W",
    set3Col: "X",
    set4Col: "Y",
  },
  {
    day: "Friday",
    exerciseCol: "Z",
    warmupCol: "AA",
    set1Col: "AB",
    set2Col: "AC",
    set3Col: "AD",
    set4Col: "AE",
  },
  {
    day: "Saturday",
    exerciseCol: "AF",
    warmupCol: "AG",
    set1Col: "AH",
    set2Col: "AI",
    set3Col: "AJ",
    set4Col: "AK",
  },
  {
    day: "Sunday",
    exerciseCol: "AL",
    warmupCol: "AM",
    set1Col: "AN",
    set2Col: "AO",
    set3Col: "AP",
    set4Col: "AQ",
  },
];
