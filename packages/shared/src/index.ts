// Shared types for the workout tracker app

// ============================================================================
// Basic Types
// ============================================================================

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

// ============================================================================
// Date Utility Functions
// ============================================================================

const DAYS_OF_WEEK_ARRAY: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Get the day of week from a date string (YYYY-MM-DD) or Date object
 */
export function getDayOfWeek(date: string | Date): DayOfWeek {
  const d = typeof date === "string" ? new Date(date) : date;
  // JavaScript's getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday to be 0, so we adjust: (getDay() + 6) % 7
  const dayIndex = (d.getDay() + 6) % 7;
  return DAYS_OF_WEEK_ARRAY[dayIndex];
}

/**
 * Get the ISO week number from a date string (YYYY-MM-DD) or Date object
 * ISO 8601: weeks start on Monday, week 1 contains the first Thursday
 */
export function getWeekNumber(date: string | Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNr + 3); // Thursday of current week
  const firstThursday = new Date(target.getFullYear(), 0, 4); // First Thursday of year
  const dayNrFirstThursday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - dayNrFirstThursday + 3);
  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 86400000 / 7);
  return weekNumber;
}

/**
 * Get the year from a date string (YYYY-MM-DD) or Date object
 */
export function getYear(date: string | Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getFullYear();
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse a date string to Date object (handles YYYY-MM-DD)
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

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
  groupId?: string; // ID for linking superset exercises (e.g., "SS1")
  groupType?: "superset"; // Type of grouping - currently only superset supported
}

/**
 * A workout session containing all exercises for a specific date
 */
export interface Workout {
  date: string; // YYYY-MM-DD format
  day?: string; // Day of week (optional for backwards compatibility)
  dayOfWeek?: string; // Full day name (e.g., "Monday") - used for database
  exercises: Exercise[];
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
  muscleGroup: string; // Muscle group from exercise master
}

/**
 * Exercise trend data point for charts
 */
export interface TrendDataPoint {
  date: string;
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
 * Volume history for overall progress tracking (aggregated by week)
 */
export interface VolumeHistory {
  week: string; // ISO week format: YYYY-Www (e.g., "2026-W2")
  totalVolume: number;
  exerciseCount: number;
  muscleGroups: Record<string, number>; // muscle group name -> volume
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

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Triceps",
  "Shoulders",
  "Biceps",
  "Back",
  "Legs",
  "Core",
];

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

// ============================================================================
// Exercise Master Types
// ============================================================================

export interface ExerciseMaster {
  id: number;
  name: string;
  muscleGroup: MuscleGroup;
  notes: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface NewExerciseMaster {
  name: string;
  muscleGroup: MuscleGroup;
  notes?: string;
}

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
