import { useState } from "react";
import { useWorkoutLogData, useWorkoutLogSync } from "@/hooks/useWorkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { DayOfWeek } from "@monke-bar/shared";
import { getMuscleGroup, MUSCLE_GROUP_COLORS } from "@monke-bar/shared";

const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface WorkoutViewProps {
  spreadsheetId: string;
  sheetName: string;
}

export function WorkoutView({ spreadsheetId, sheetName }: WorkoutViewProps) {
  const {
    data: logData,
    isLoading,
    error,
  } = useWorkoutLogData(spreadsheetId, sheetName);
  const syncMutation = useWorkoutLogSync(spreadsheetId, sheetName);

  const weeks = logData?.weeks;

  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    // Default to today's day of week
    const today = new Date().getDay();
    // Convert Sunday = 0 to Sunday = 6
    return today === 0 ? 6 : today - 1;
  });

  // Track which week to show (null = latest)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(
    null
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading workouts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive">
              Failed to load workouts. Make sure the API is running and Google
              Sheets is configured.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  syncMutation.isPending ? "animate-spin" : ""
                }`}
              />
              Retry Sync
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!weeks || weeks.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No workouts found. Sync with Google Sheets to get started.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  syncMutation.isPending ? "animate-spin" : ""
                }`}
              />
              Sync Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort weeks by week number and get the selected or latest week
  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const weekIndex = selectedWeekIndex ?? sortedWeeks.length - 1;
  const currentWeek = sortedWeeks[weekIndex];

  const selectedDay = DAYS[selectedDayIndex];
  const dayWorkout = currentWeek?.days.find((d) => d.dayOfWeek === selectedDay);

  const goToPrevDay = () => {
    setSelectedDayIndex((prev) => (prev - 1 + 7) % 7);
  };

  const goToNextDay = () => {
    setSelectedDayIndex((prev) => (prev + 1) % 7);
  };

  const goToPrevWeek = () => {
    if (weekIndex > 0) {
      setSelectedWeekIndex(weekIndex - 1);
    }
  };

  const goToNextWeek = () => {
    if (weekIndex < sortedWeeks.length - 1) {
      setSelectedWeekIndex(weekIndex + 1);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Week selector */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevWeek}
          disabled={weekIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold min-w-[100px] text-center">
          Week {currentWeek?.weekNumber}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          disabled={weekIndex >= sortedWeeks.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h3 className="text-xl font-bold">{selectedDay}</h3>

        <Button variant="ghost" size="icon" onClick={goToNextDay}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Day pills */}
      <div className="flex gap-1 justify-center">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDayIndex(idx)}
            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
              idx === selectedDayIndex
                ? "bg-primary text-primary-foreground"
                : currentWeek?.days.some((d) => d.dayOfWeek === day)
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {day.charAt(0)}
          </button>
        ))}
      </div>

      {/* Exercises */}
      {dayWorkout ? (
        <div className="space-y-3">
          {dayWorkout.exercises.map((exercise, idx) => {
            const muscleGroup = getMuscleGroup(exercise.name);
            const colorClass = muscleGroup
              ? MUSCLE_GROUP_COLORS[muscleGroup]
              : "";

            return (
              <Card key={exercise.id || idx} className="animate-slide-up">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {exercise.name}
                    {muscleGroup && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}
                      >
                        {muscleGroup}
                      </span>
                    )}
                    {exercise.sets.some((s) => !s.isWarmup && s.weight > 0) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary ml-auto">
                        {Math.max(
                          ...exercise.sets
                            .filter((s) => !s.isWarmup)
                            .map((s) => s.weight)
                        )}
                        kg
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {/* Warmup */}
                    {exercise.sets.some((s) => s.isWarmup) && (
                      <SetBadge
                        label="W"
                        set={exercise.sets.find((s) => s.isWarmup)}
                        isWarmup
                      />
                    )}
                    {/* Working sets */}
                    {exercise.sets
                      .filter((s) => !s.isWarmup)
                      .map((set) => (
                        <SetBadge
                          key={set.setNumber}
                          label={`S${set.setNumber}`}
                          set={set}
                        />
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Rest day 😴</p>
            <p className="text-xs text-muted-foreground mt-1">
              No exercises logged for {selectedDay}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SetBadgeProps {
  label: string;
  set?: { weight: number; reps: number };
  isWarmup?: boolean;
}

function SetBadge({ label, set, isWarmup }: SetBadgeProps) {
  if (!set) return null;

  return (
    <div
      className={`flex flex-col items-center p-2 rounded-lg ${
        isWarmup ? "bg-muted/50" : "bg-secondary"
      }`}
    >
      <span className="text-[10px] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-semibold text-sm">{set.weight}</span>
      <span className="text-xs text-muted-foreground">×{set.reps}</span>
    </div>
  );
}
