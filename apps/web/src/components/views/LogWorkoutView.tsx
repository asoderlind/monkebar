import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  Save,
  Timer,
  Pause,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useAddWorkoutEntries,
  useWorkoutByDate,
  useDeleteExercise,
} from "@/hooks/useWorkouts";
import { useExercises } from "@/hooks/useExercises";
import type { WorkoutLogEntry } from "@/lib/api";
import type { DayOfWeek, MuscleGroup } from "@monke-bar/shared";
import { SavedExerciseCard } from "@/components/workout/SavedExerciseCard";
import { UnsavedExerciseCard } from "@/components/workout/UnsavedExerciseCard";
import { useWorkoutDraft } from "@/components/workout/useWorkoutDraft";
import { formatDate, formatDateHeader, DAYS } from "@/components/workout/utils";

interface LogWorkoutViewProps {
  spreadsheetId: string;
  sheetName: string;
  databaseMode: "sheets" | "postgres";
  restTimerDuration: number;
}

export function LogWorkoutView({
  spreadsheetId,
  sheetName,
  databaseMode,
  restTimerDuration,
}: LogWorkoutViewProps) {
  // State for date selection
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date())
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay();
    return DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
  });

  // Date navigation handlers
  const handlePreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(formatDate(currentDate));
    const dayIndex = currentDate.getDay();
    setSelectedDay(DAYS[dayIndex === 0 ? 6 : dayIndex - 1]);
  };

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(formatDate(currentDate));
    const dayIndex = currentDate.getDay();
    setSelectedDay(DAYS[dayIndex === 0 ? 6 : dayIndex - 1]);
  };

  // Rest timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive || remainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, remainingSeconds]);

  // Timer controls
  const startTimer = (duration: number) => {
    setRemainingSeconds(duration);
    setTimerActive(true);
  };

  const pauseTimer = () => {
    setTimerActive(false);
  };

  const resumeTimer = () => {
    if (remainingSeconds > 0) {
      setTimerActive(true);
    }
  };

  const resetTimer = () => {
    setRemainingSeconds(0);
    setTimerActive(false);
  };

  // Format timer display as MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Fetch exercises from database to get muscle groups
  const { data: exercisesData } = useExercises();

  // Create a lookup map for exercise muscle groups
  const exerciseMuscleGroupMap =
    exercisesData?.reduce((acc, ex) => {
      if (ex.muscleGroup) {
        acc[ex.name] = ex.muscleGroup;
      }
      return acc;
    }, {} as Record<string, MuscleGroup>) || {};

  // Fetch saved workouts for the selected date
  const { data: savedWorkout } = useWorkoutByDate(
    selectedDate,
    spreadsheetId,
    sheetName,
    databaseMode
  );

  // Use custom hook for draft management
  const {
    supersetMode,
    unsavedExercise,
    unsavedExercise2,
    updateExercise,
    updateExercise2,
    toggleSupersetMode,
    resetDraft,
  } = useWorkoutDraft();

  // Save workout mutation
  const saveMutation = useAddWorkoutEntries(
    spreadsheetId,
    sheetName,
    databaseMode
  );
  // Delete exercise mutation
  const deleteMutation = useDeleteExercise(databaseMode);

  const handleDeleteExercise = (exerciseId: string) => {
    if (confirm("Are you sure you want to delete this exercise?")) {
      deleteMutation.mutate({ date: selectedDate, exerciseId });
    }
  };
  const handleSave = () => {
    if (!unsavedExercise.name.trim()) {
      return;
    }

    const entries: WorkoutLogEntry[] = [];

    // Generate a unique group ID for this superset if in superset mode
    const groupId = supersetMode ? `SS${Date.now()}` : undefined;

    // Add first exercise
    const entry1: WorkoutLogEntry = {
      date: selectedDate,
      day: selectedDay,
      exercise: unsavedExercise.name.trim(),
      warmup:
        unsavedExercise.warmup.reps > 0
          ? {
              weight: unsavedExercise.warmup.weight,
              reps: unsavedExercise.warmup.reps,
            }
          : undefined,
      sets: unsavedExercise.sets
        .filter((s) => s.reps > 0)
        .map((s) => ({
          weight: s.weight,
          reps: s.reps,
        })),
      groupId,
      groupType: groupId ? "superset" : undefined,
    };

    if (entry1.sets.length > 0 || entry1.warmup) {
      entries.push(entry1);
    }

    // Add second exercise if in superset mode
    if (supersetMode && unsavedExercise2.name.trim()) {
      const entry2: WorkoutLogEntry = {
        date: selectedDate,
        day: selectedDay,
        exercise: unsavedExercise2.name.trim(),
        warmup:
          unsavedExercise2.warmup.reps > 0
            ? {
                weight: unsavedExercise2.warmup.weight,
                reps: unsavedExercise2.warmup.reps,
              }
            : undefined,
        sets: unsavedExercise2.sets
          .filter((s) => s.reps > 0)
          .map((s) => ({
            weight: s.weight,
            reps: s.reps,
          })),
        groupId,
        groupType: "superset",
      };

      if (entry2.sets.length > 0 || entry2.warmup) {
        entries.push(entry2);
      }
    }

    if (entries.length === 0) {
      return;
    }

    saveMutation.mutate(entries, {
      onSuccess: () => {
        resetDraft();
      },
    });
  };

  // Group saved exercises by superset
  const groupedExercises = savedWorkout?.exercises.reduce((acc, exercise) => {
    if (exercise.groupId) {
      if (!acc[exercise.groupId]) {
        acc[exercise.groupId] = [];
      }
      acc[exercise.groupId].push(exercise);
    } else {
      acc[exercise.id] = [exercise];
    }
    return acc;
  }, {} as Record<string, typeof savedWorkout.exercises>);

  return (
    <div className="p-4 space-y-4">
      {/* Large Date Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold">
            {formatDateHeader(selectedDate)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Rest Timer */}
      {remainingSeconds > 0 && (
        <div className="flex items-center justify-center gap-3 p-4 bg-card border rounded-lg">
          <Timer className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-mono font-bold">
            {formatTimer(remainingSeconds)}
          </span>
          <div className="flex gap-2">
            {timerActive ? (
              <Button variant="outline" size="sm" onClick={pauseTimer}>
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resumeTimer}>
                <Timer className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Superset Mode Toggle */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Superset Mode</span>
        </div>
        <Button
          variant={supersetMode ? "default" : "outline"}
          size="sm"
          onClick={toggleSupersetMode}
        >
          {supersetMode ? "ON" : "OFF"}
        </Button>
      </div>

      {/* Unsaved exercise form(s) */}
      <div className={supersetMode ? "space-y-4" : ""}>
        {supersetMode && (
          <div className="text-sm text-muted-foreground mb-2">
            Exercise 1 of 2
          </div>
        )}
        <UnsavedExerciseCard
          exerciseName={unsavedExercise.name}
          onExerciseNameChange={(name) =>
            updateExercise((prev) => ({ ...prev, name }))
          }
          warmup={unsavedExercise.warmup}
          sets={unsavedExercise.sets}
          onWarmupChange={(warmup) =>
            updateExercise((prev) => ({ ...prev, warmup }))
          }
          onSetChange={(index, set) => {
            updateExercise((prev) => {
              const newSets = [...prev.sets];
              newSets[index] = set;
              return { ...prev, sets: newSets };
            });
            // Start rest timer after completing a working set
            if (set.reps > 0) {
              startTimer(restTimerDuration);
              toast.success("Draft saved");
            }
          }}
          onSave={handleSave}
          onReset={resetDraft}
          isSaving={saveMutation.isPending}
          spreadsheetId={spreadsheetId}
          sheetName={sheetName}
          showSaveButton={!supersetMode}
        />

        {supersetMode && (
          <>
            <div className="text-sm text-muted-foreground">Exercise 2 of 2</div>
            <UnsavedExerciseCard
              exerciseName={unsavedExercise2.name}
              onExerciseNameChange={(name) =>
                updateExercise2((prev) => ({ ...prev, name }))
              }
              warmup={unsavedExercise2.warmup}
              sets={unsavedExercise2.sets}
              onWarmupChange={(warmup) =>
                updateExercise2((prev) => ({ ...prev, warmup }))
              }
              onSetChange={(index, set) => {
                updateExercise2((prev) => {
                  const newSets = [...prev.sets];
                  newSets[index] = set;
                  return { ...prev, sets: newSets };
                });
                // Start rest timer after completing a working set
                if (set.reps > 0) {
                  startTimer(restTimerDuration);
                  toast.success("Draft saved");
                }
              }}
              onSave={handleSave}
              onReset={resetDraft}
              isSaving={saveMutation.isPending}
              spreadsheetId={spreadsheetId}
              sheetName={sheetName}
              showSaveButton={false}
            />

            {/* Save button for superset mode */}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saveMutation.isPending || !unsavedExercise.name.trim()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Saved exercises (read-only) */}
      {groupedExercises && Object.keys(groupedExercises).length > 0 && (
        <>
          {Object.values(groupedExercises).map((exercises) => {
            const isSuperset = exercises.length > 1;
            return (
              <div
                key={exercises[0].id}
                className={isSuperset ? "space-y-2" : ""}
              >
                {exercises.map((exercise, idx) => (
                  <div key={exercise.id}>
                    {isSuperset && idx === 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                        Superset {exercise.groupId}
                      </div>
                    )}
                    <SavedExerciseCard
                      exerciseName={exercise.name}
                      muscleGroup={exerciseMuscleGroupMap[exercise.name]}
                      sets={exercise.sets}
                      groupId={exercise.groupId}
                      groupType={exercise.groupType}
                      onDelete={
                        databaseMode === "postgres"
                          ? () => handleDeleteExercise(exercise.id)
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      {saveMutation.isError && (
        <p className="text-sm text-destructive text-center">
          Failed to save: {(saveMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
