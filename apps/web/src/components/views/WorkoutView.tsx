import { useState, useMemo } from "react";
import { useWorkoutLogData, useWorkoutLogSync } from "@/hooks/useWorkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  getMuscleGroup,
  MUSCLE_GROUP_COLORS,
  getDayOfWeek,
} from "@monke-bar/shared";

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

  const workouts = logData?.workouts;

  // Get sorted workout dates
  const sortedDates = useMemo(() => {
    if (!workouts) return [];
    return [...workouts].map((w) => w.date).sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  // Current date index (latest by default)
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(
    () => sortedDates.length - 1
  );

  // Get current workout
  const currentDate = sortedDates[selectedDateIndex];
  const currentWorkout = workouts?.find((w) => w.date === currentDate);

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

  if (!workouts || workouts.length === 0) {
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

  const goToPrevWorkout = () => {
    if (selectedDateIndex > 0) {
      setSelectedDateIndex(selectedDateIndex - 1);
    }
  };

  const goToNextWorkout = () => {
    if (selectedDateIndex < sortedDates.length - 1) {
      setSelectedDateIndex(selectedDateIndex + 1);
    }
  };

  const dayOfWeek = currentDate ? getDayOfWeek(currentDate) : "";

  return (
    <div className="p-4 space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevWorkout}
          disabled={selectedDateIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center">
          <h3 className="text-xl font-bold">{dayOfWeek}</h3>
          <p className="text-sm text-muted-foreground">{currentDate}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWorkout}
          disabled={selectedDateIndex >= sortedDates.length - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Exercises */}
      {currentWorkout && currentWorkout.exercises.length > 0 ? (
        <div className="space-y-3">
          {currentWorkout.exercises.map((exercise, idx) => {
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
              No exercises logged for {currentDate}
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

  const isBodyweight = set.weight === 0;

  return (
    <div
      className={`flex flex-col items-center p-2 rounded-lg ${
        isWarmup ? "bg-muted/50" : "bg-secondary"
      }`}
    >
      <span className="text-[10px] text-muted-foreground uppercase">
        {label}
      </span>
      {isBodyweight ? (
        <span className="font-semibold text-sm">{set.reps} reps</span>
      ) : (
        <>
          <span className="font-semibold text-sm">{set.weight}</span>
          <span className="text-xs text-muted-foreground">×{set.reps}</span>
        </>
      )}
    </div>
  );
}
