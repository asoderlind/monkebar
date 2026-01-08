import type { DayOfWeek } from "@monke-bar/shared";

export const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Format date as YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Format date header: "Sunday Jan 4th"
export function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
      ? "nd"
      : day === 3 || day === 23
      ? "rd"
      : "th";
  return `${weekday} ${month} ${day}${suffix}`;
}

// Calculate volume diff for a set
export function calculateDiff(
  currentWeight: number,
  currentReps: number,
  lastWeight: number,
  lastReps: number
): number | null {
  const isBodyweight = currentWeight === 0 && lastWeight === 0;
  if (isBodyweight) {
    const diff = currentReps - lastReps;
    return diff !== 0 ? diff : null;
  } else {
    const currentVolume = currentWeight * currentReps;
    const lastVolume = lastWeight * lastReps;
    const diff = currentVolume - lastVolume;
    return diff !== 0 ? diff : null;
  }
}

// Calculate diff with progressive overload detection
export interface DiffResult {
  value: number | null;
  isProgressiveOverload: boolean; // true if weight increased (regardless of volume)
  displayValue: string | null; // what to show in UI
}

export function calculateDiffWithOverload(
  currentWeight: number,
  currentReps: number,
  lastWeight: number,
  lastReps: number
): DiffResult {
  const isBodyweight = currentWeight === 0 && lastWeight === 0;
  
  if (isBodyweight) {
    const diff = currentReps - lastReps;
    return {
      value: diff !== 0 ? diff : null,
      isProgressiveOverload: false,
      displayValue: diff !== 0 ? diff.toString() : null,
    };
  }
  
  const currentVolume = currentWeight * currentReps;
  const lastVolume = lastWeight * lastReps;
  const volumeDiff = currentVolume - lastVolume;
  const weightIncreased = currentWeight > lastWeight;
  
  // If weight increased, that's progressive overload even if volume decreased
  if (weightIncreased) {
    return {
      value: volumeDiff,
      isProgressiveOverload: true,
      displayValue: "+", // Just show "+" for progressive overload
    };
  }
  
  // Otherwise, show normal volume diff
  return {
    value: volumeDiff !== 0 ? volumeDiff : null,
    isProgressiveOverload: false,
    displayValue: volumeDiff !== 0 ? volumeDiff.toString() : null,
  };
}
