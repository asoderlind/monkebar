import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, ChevronDown, Check, Loader2 } from "lucide-react";
import { useAddWorkoutEntries } from "@/hooks/useWorkouts";
import type { WorkoutLogEntry } from "@/lib/api";
import type { DayOfWeek } from "@monke-bar/shared";
import {
  EXERCISE_MUSCLE_GROUPS,
  getMuscleGroup,
  MUSCLE_GROUP_COLORS,
} from "@monke-bar/shared";

const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Get week number from date
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface SetInput {
  weight: string;
  reps: string;
}

interface ExerciseInput {
  name: string;
  warmup: SetInput;
  sets: SetInput[];
}

interface LogWorkoutViewProps {
  spreadsheetId: string;
  sheetName: string;
}

export function LogWorkoutView({
  spreadsheetId,
  sheetName,
}: LogWorkoutViewProps) {
  // State for the workout form
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date())
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay();
    return DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
  });
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    {
      name: "",
      warmup: { weight: "", reps: "" },
      sets: [
        { weight: "", reps: "" },
        { weight: "", reps: "" },
        { weight: "", reps: "" },
        { weight: "", reps: "" },
      ],
    },
  ]);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState<
    number | null
  >(null);

  // Update day when date changes
  useEffect(() => {
    const date = new Date(selectedDate);
    const dayIndex = date.getDay();
    setSelectedDay(DAYS[dayIndex === 0 ? 6 : dayIndex - 1]);
  }, [selectedDate]);

  // Save workout mutation
  const saveMutation = useAddWorkoutEntries(spreadsheetId, sheetName);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        name: "",
        warmup: { weight: "", reps: "" },
        sets: [
          { weight: "", reps: "" },
          { weight: "", reps: "" },
          { weight: "", reps: "" },
          { weight: "", reps: "" },
        ],
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (
    index: number,
    field: keyof ExerciseInput,
    value: string | SetInput | SetInput[]
  ) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetInput,
    value: string
  ) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value,
    };
    setExercises(updated);
  };

  const updateWarmup = (
    exerciseIndex: number,
    field: keyof SetInput,
    value: string
  ) => {
    const updated = [...exercises];
    updated[exerciseIndex].warmup = {
      ...updated[exerciseIndex].warmup,
      [field]: value,
    };
    setExercises(updated);
  };

  const selectExercise = (exerciseIndex: number, exerciseName: string) => {
    updateExercise(exerciseIndex, "name", exerciseName);
    setShowExerciseDropdown(null);
  };

  const resetForm = () => {
    setExercises([
      {
        name: "",
        warmup: { weight: "", reps: "" },
        sets: [
          { weight: "", reps: "" },
          { weight: "", reps: "" },
          { weight: "", reps: "" },
          { weight: "", reps: "" },
        ],
      },
    ]);
  };

  const handleSave = () => {
    const entries: WorkoutLogEntry[] = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        date: selectedDate,
        day: selectedDay,
        exercise: ex.name.trim(),
        warmup:
          ex.warmup.weight && ex.warmup.reps
            ? {
                weight: parseFloat(ex.warmup.weight),
                reps: parseInt(ex.warmup.reps, 10),
              }
            : undefined,
        sets: ex.sets
          .filter((s) => s.weight && s.reps)
          .map((s) => ({
            weight: parseFloat(s.weight),
            reps: parseInt(s.reps, 10),
          })),
      }))
      .filter((entry) => entry.sets.length > 0 || entry.warmup);

    if (entries.length === 0) {
      alert("Please add at least one exercise with sets");
      return;
    }

    saveMutation.mutate(entries, {
      onSuccess: () => resetForm(),
    });
  };

  const knownExercises = Object.keys(EXERCISE_MUSCLE_GROUPS);

  return (
    <div className="p-4 space-y-4">
      {/* Date & Day selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Day
              </label>
              <div className="mt-1 py-2 px-3 bg-muted rounded-md text-sm">
                {selectedDay}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Week {getWeekNumber(new Date(selectedDate))} of{" "}
            {new Date(selectedDate).getFullYear()}
          </div>
        </CardContent>
      </Card>

      {/* Exercises */}
      {exercises.map((exercise, exIndex) => {
        const muscleGroup = getMuscleGroup(exercise.name);
        const colorClass = muscleGroup ? MUSCLE_GROUP_COLORS[muscleGroup] : "";

        return (
          <Card key={exIndex} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Exercise name"
                    value={exercise.name}
                    onChange={(e) =>
                      updateExercise(exIndex, "name", e.target.value)
                    }
                    onFocus={() => setShowExerciseDropdown(exIndex)}
                    onBlur={() =>
                      setTimeout(() => setShowExerciseDropdown(null), 200)
                    }
                    className="pr-8"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  {/* Exercise dropdown */}
                  {showExerciseDropdown === exIndex && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {knownExercises
                        .filter((name) =>
                          name
                            .toLowerCase()
                            .includes(exercise.name.toLowerCase())
                        )
                        .map((name) => {
                          const mg = getMuscleGroup(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                              onMouseDown={() => selectExercise(exIndex, name)}
                            >
                              {name}
                              {mg && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_GROUP_COLORS[mg]}`}
                                >
                                  {mg}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {muscleGroup && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${colorClass}`}
                  >
                    {muscleGroup}
                  </span>
                )}

                {exercises.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(exIndex)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Warmup */}
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground uppercase">
                  Warmup
                </label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="kg"
                      value={exercise.warmup.weight}
                      onChange={(e) =>
                        updateWarmup(exIndex, "weight", e.target.value)
                      }
                      className="text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="reps"
                      value={exercise.warmup.reps}
                      onChange={(e) =>
                        updateWarmup(exIndex, "reps", e.target.value)
                      }
                      className="text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Working sets */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">
                  Working Sets
                </label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {exercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className="space-y-1">
                      <div className="text-[10px] text-center text-muted-foreground">
                        Set {setIndex + 1}
                      </div>
                      <Input
                        type="number"
                        placeholder="kg"
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(exIndex, setIndex, "weight", e.target.value)
                        }
                        className="text-center text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="reps"
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(exIndex, setIndex, "reps", e.target.value)
                        }
                        className="text-center text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add exercise button */}
      <Button variant="outline" className="w-full" onClick={addExercise}>
        <Plus className="h-4 w-4 mr-2" />
        Add Exercise
      </Button>

      {/* Save button */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : saveMutation.isSuccess ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Saved!
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Workout
          </>
        )}
      </Button>

      {saveMutation.isError && (
        <p className="text-sm text-destructive text-center">
          Failed to save: {(saveMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
