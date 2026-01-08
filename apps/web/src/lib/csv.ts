import type { Workout, Exercise, WorkoutSet } from "@monke-bar/shared";
import { getDayOfWeek } from "@monke-bar/shared";

/**
 * CSV Headers for workout export/import
 * Format: Date,Day,Exercise,Warmup,Set1,Set2,Set3,Set4
 */
const CSV_HEADERS = [
  "Date",
  "Day",
  "Exercise",
  "Warmup",
  "Set1",
  "Set2",
  "Set3",
  "Set4",
] as const;

/**
 * Format a set as "weight, reps" (e.g., "70kg, 6") or just reps for bodyweight (e.g., "7")
 */
function formatSet(set: WorkoutSet): string {
  if (set.weight === 0) {
    // Bodyweight exercise - just reps
    return set.reps.toString();
  }
  return `${set.weight}kg, ${set.reps}`;
}

/**
 * Parse a set from "weight, reps" format (e.g., "70kg, 6") or just reps for bodyweight (e.g., "7")
 */
function parseSet(setStr: string): WorkoutSet | null {
  if (!setStr || !setStr.trim()) return null;

  const trimmed = setStr.trim();

  // Try to match "weight, reps" format first
  const weightedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*kg\s*,\s*(\d+)$/);
  if (weightedMatch) {
    return {
      weight: parseFloat(weightedMatch[1]),
      reps: parseInt(weightedMatch[2], 10),
      isWarmup: false,
      setNumber: 0, // Will be set later
    };
  }

  // Try to match just reps (bodyweight exercises like chinups)
  const bodyweightMatch = trimmed.match(/^(\d+)$/);
  if (bodyweightMatch) {
    return {
      weight: 0, // 0 indicates bodyweight
      reps: parseInt(bodyweightMatch[1], 10),
      isWarmup: false,
      setNumber: 0, // Will be set later
    };
  }

  throw new Error(
    `Invalid set format: "${setStr}". Expected "70kg, 6" or just "7" for bodyweight`
  );
}

/**
 * Escape CSV values that contain commas or quotes
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export workouts to CSV format
 */
export function exportWorkoutsToCSV(workouts: Workout[]): string {
  const rows: string[] = [];

  // Add header row
  rows.push(CSV_HEADERS.join(","));

  // Process each workout
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      // Separate warmup sets from working sets
      const warmupSets = exercise.sets.filter((s) => s.isWarmup);
      const workingSets = exercise.sets.filter((s) => !s.isWarmup);

      const row = [
        workout.date,
        workout.day || "",
        exercise.name,
        warmupSets.length > 0 ? escapeCSVValue(formatSet(warmupSets[0])) : "",
        workingSets[0] ? escapeCSVValue(formatSet(workingSets[0])) : "",
        workingSets[1] ? escapeCSVValue(formatSet(workingSets[1])) : "",
        workingSets[2] ? escapeCSVValue(formatSet(workingSets[2])) : "",
        workingSets[3] ? escapeCSVValue(formatSet(workingSets[3])) : "",
      ];
      rows.push(row.join(","));
    }
  }

  return rows.join("\n");
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  return fields;
}

/**
 * Validation error for CSV import
 */
export class CSVValidationError extends Error {
  constructor(message: string, public row: number, public field?: string) {
    super(`Row ${row}${field ? ` (${field})` : ""}: ${message}`);
    this.name = "CSVValidationError";
  }
}

/**
 * Parse CSV content into workouts
 * Format: Date,Day,Exercise,Warmup,Set1,Set2,Set3,Set4
 */
export function parseCSVToWorkouts(csvContent: string): Workout[] {
  const lines = csvContent.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Validate header
  const expectedHeaders = CSV_HEADERS as readonly string[];
  if (headers.length !== expectedHeaders.length) {
    throw new Error(
      `Invalid CSV format. Expected ${expectedHeaders.length} columns, got ${headers.length}`
    );
  }

  for (let i = 0; i < expectedHeaders.length; i++) {
    if (headers[i] !== expectedHeaders[i]) {
      throw new Error(
        `Invalid header at column ${i + 1}. Expected "${
          expectedHeaders[i]
        }", got "${headers[i]}"`
      );
    }
  }

  // Parse data rows grouped by date
  const rowsByDate = new Map<
    string,
    {
      date: string;
      day: string;
      exercise: string;
      warmup: string;
      set1: string;
      set2: string;
      set3: string;
      set4: string;
    }[]
  >();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const fields = parseCSVLine(line);
    const rowNum = i + 1;

    if (fields.length !== CSV_HEADERS.length) {
      throw new CSVValidationError(
        `Expected ${CSV_HEADERS.length} fields, got ${fields.length}`,
        rowNum
      );
    }

    const [date, day, exercise, warmup, set1, set2, set3, set4] = fields;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new CSVValidationError(
        `Invalid date format "${date}". Expected YYYY-MM-DD`,
        rowNum,
        "Date"
      );
    }

    // Validate exercise name
    if (!exercise.trim()) {
      throw new CSVValidationError(
        "Exercise name cannot be empty",
        rowNum,
        "Exercise"
      );
    }

    // Group rows by date
    if (!rowsByDate.has(date)) {
      rowsByDate.set(date, []);
    }
    rowsByDate.get(date)!.push({
      date,
      day,
      exercise: exercise.trim(),
      warmup,
      set1,
      set2,
      set3,
      set4,
    });
  }

  // Convert grouped rows to Workout objects
  const workouts: Workout[] = [];

  for (const [date, rows] of rowsByDate.entries()) {
    const exercises: Exercise[] = [];

    for (const row of rows) {
      const sets: WorkoutSet[] = [];

      // Parse warmup set
      if (row.warmup) {
        try {
          const warmupSet = parseSet(row.warmup);
          if (warmupSet) {
            sets.push({ ...warmupSet, isWarmup: true, setNumber: 0 });
          }
        } catch (error) {
          throw new CSVValidationError(
            error instanceof Error
              ? error.message
              : "Invalid warmup set format",
            rows.indexOf(row) + 2,
            "Warmup"
          );
        }
      }

      // Parse working sets
      const workingSets = [row.set1, row.set2, row.set3, row.set4];
      for (let i = 0; i < workingSets.length; i++) {
        if (workingSets[i]) {
          try {
            const workingSet = parseSet(workingSets[i]);
            if (workingSet) {
              sets.push({ ...workingSet, isWarmup: false, setNumber: i + 1 });
            }
          } catch (error) {
            throw new CSVValidationError(
              error instanceof Error ? error.message : "Invalid set format",
              rows.indexOf(row) + 2,
              `Set${i + 1}`
            );
          }
        }
      }

      exercises.push({
        id: crypto.randomUUID(),
        name: row.exercise,
        sets,
      });
    }

    workouts.push({
      date,
      day: rows[0].day || undefined,
      dayOfWeek: getDayOfWeek(date), // Calculate from date
      exercises,
    });
  }

  // Sort workouts by date (ascending)
  workouts.sort((a, b) => a.date.localeCompare(b.date));

  return workouts;
}

/**
 * Download a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate a sample CSV template
 */
export function generateCSVTemplate(): string {
  const sampleData: Workout[] = [
    {
      date: "2025-12-30",
      day: "Tuesday",
      exercises: [
        {
          id: "1",
          name: "Flat Bench Press",
          sets: [
            { setNumber: 1, weight: 70, reps: 6, isWarmup: false },
            { setNumber: 2, weight: 70, reps: 7, isWarmup: false },
            { setNumber: 3, weight: 70, reps: 6, isWarmup: false },
          ],
        },
        {
          id: "2",
          name: "Shoulder Rotate Rope",
          sets: [
            { setNumber: 0, weight: 5, reps: 12, isWarmup: true },
            { setNumber: 1, weight: 7.5, reps: 7, isWarmup: false },
            { setNumber: 2, weight: 7.5, reps: 6, isWarmup: false },
            { setNumber: 3, weight: 7.5, reps: 5, isWarmup: false },
          ],
        },
        {
          id: "3",
          name: "Chinups",
          sets: [
            { setNumber: 1, weight: 0, reps: 7, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 7, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 5, isWarmup: false },
          ],
        },
      ],
    },
  ];

  return exportWorkoutsToCSV(sampleData);
}
