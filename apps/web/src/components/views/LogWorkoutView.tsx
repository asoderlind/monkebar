import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Save,
  ChevronDown,
  Check,
  Loader2,
  History,
  RotateCcw,
} from "lucide-react";
import {
  useAddWorkoutEntries,
  useExerciseHistory,
  useWorkoutByDate,
} from "@/hooks/useWorkouts";
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
  weight: number;
  reps: number;
}

interface LogWorkoutViewProps {
  spreadsheetId: string;
  sheetName: string;
}

// Modal for editing weight or reps with increment/decrement buttons
interface SetInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "weight" | "reps";
  value: number;
  onAccept: (value: number) => void;
}

function SetInputModal({
  open,
  onOpenChange,
  type,
  value,
  onAccept,
}: SetInputModalProps) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value, open]);

  const increment = type === "weight" ? 2.5 : 1;

  const handleIncrement = () => {
    setCurrentValue((prev) => prev + increment);
  };

  const handleDecrement = () => {
    setCurrentValue((prev) => Math.max(0, prev - increment));
  };

  const handleAccept = () => {
    onAccept(currentValue);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCurrentValue(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Set {type === "weight" ? "Weight (kg)" : "Reps"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            className="h-12 w-12"
          >
            <Minus className="h-6 w-6" />
          </Button>
          <div className="text-4xl font-bold w-24 text-center">
            {type === "weight" ? currentValue.toFixed(1) : currentValue}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            className="h-12 w-12"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Component to show last 2 sessions for an exercise
function ExerciseHistoryPreview({
  exerciseName,
  spreadsheetId,
  sheetName,
}: {
  exerciseName: string;
  spreadsheetId: string;
  sheetName: string;
}) {
  const { data, isLoading } = useExerciseHistory(
    exerciseName,
    spreadsheetId,
    sheetName
  );

  if (!exerciseName || isLoading) return null;
  if (!data?.history || data.history.length === 0) return null;

  // Get last 2 sessions (sorted by date, most recent first)
  const lastSessions = [...data.history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  if (lastSessions.length === 0) return null;

  return (
    <div className="mx-4 mb-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase">
          Previous Sessions
        </span>
      </div>
      <div className="space-y-2">
        {lastSessions.map((session, idx) => {
          const workingSets = session.sets.filter((s) => !s.isWarmup);
          const warmupSet = session.sets.find((s) => s.isWarmup);
          const dateStr = new Date(session.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const dayOfWeek = new Date(session.date).toLocaleDateString("en-US", {
            weekday: "short",
          });

          return (
            <div
              key={idx}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground min-w-[70px]">
                {dateStr} ({dayOfWeek})
              </span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {warmupSet && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    W:{" "}
                    {warmupSet.weight === 0
                      ? warmupSet.reps
                      : `${warmupSet.weight}×${warmupSet.reps}`}
                  </span>
                )}
                {workingSets.map((set) => (
                  <span
                    key={set.setNumber}
                    className="px-1.5 py-0.5 rounded bg-primary/10 text-foreground font-medium"
                  >
                    {set.weight === 0 ? set.reps : `${set.weight}×${set.reps}`}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Read-only card for saved exercises
interface SavedExerciseCardProps {
  exerciseName: string;
  sets: Array<{ weight: number; reps: number; isWarmup: boolean }>;
}

function SavedExerciseCard({ exerciseName, sets }: SavedExerciseCardProps) {
  const muscleGroup = getMuscleGroup(exerciseName);
  const colorClass = muscleGroup ? MUSCLE_GROUP_COLORS[muscleGroup] : "";

  const warmupSet = sets.find((s) => s.isWarmup);
  const workingSets = sets.filter((s) => !s.isWarmup);

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 font-medium">{exerciseName}</div>
          {muscleGroup && (
            <span
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${colorClass}`}
            >
              {muscleGroup}
            </span>
          )}
          <Check className="h-4 w-4 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        {warmupSet && (
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Warmup
            </label>
            <div className="mt-1 flex gap-1">
              <span className="px-2 py-1 rounded bg-muted text-sm">
                {warmupSet.weight === 0
                  ? `${warmupSet.reps} reps`
                  : `${warmupSet.weight}kg × ${warmupSet.reps}`}
              </span>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase">
            Working Sets
          </label>
          <div className="mt-1 flex gap-1 flex-wrap">
            {workingSets.map((set, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded bg-primary/10 text-sm font-medium"
              >
                {set.weight === 0
                  ? `${set.reps} reps`
                  : `${set.weight}kg × ${set.reps}`}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Editable card for unsaved exercise
interface UnsavedExerciseCardProps {
  exerciseName: string;
  onExerciseNameChange: (name: string) => void;
  warmup: SetInput;
  sets: SetInput[];
  onWarmupChange: (warmup: SetInput) => void;
  onSetChange: (index: number, set: SetInput) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  spreadsheetId: string;
  sheetName: string;
}

function UnsavedExerciseCard({
  exerciseName,
  onExerciseNameChange,
  warmup,
  sets,
  onWarmupChange,
  onSetChange,
  onSave,
  onReset,
  isSaving,
  spreadsheetId,
  sheetName,
}: UnsavedExerciseCardProps) {
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: "weight" | "reps";
    setIndex: number | "warmup";
    field: "weight" | "reps";
    value: number;
  } | null>(null);

  const muscleGroup = getMuscleGroup(exerciseName);
  const colorClass = muscleGroup ? MUSCLE_GROUP_COLORS[muscleGroup] : "";
  const knownExercises = Object.keys(EXERCISE_MUSCLE_GROUPS);

  const openModal = (
    setIndex: number | "warmup",
    field: "weight" | "reps",
    value: number
  ) => {
    setModalState({
      open: true,
      type: field,
      setIndex,
      field,
      value,
    });
  };

  const handleModalAccept = (newValue: number) => {
    if (!modalState) return;

    if (modalState.setIndex === "warmup") {
      onWarmupChange({
        ...warmup,
        [modalState.field]: newValue,
      });
    } else {
      const setIndex = modalState.setIndex;
      onSetChange(setIndex, {
        ...sets[setIndex],
        [modalState.field]: newValue,
      });
    }
    setModalState(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Exercise name"
                value={exerciseName}
                onChange={(e) => onExerciseNameChange(e.target.value)}
                onFocus={() => setShowExerciseDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowExerciseDropdown(false), 200)
                }
                className="pr-8"
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              {/* Exercise dropdown */}
              {showExerciseDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {knownExercises
                    .filter((name) =>
                      name.toLowerCase().includes(exerciseName.toLowerCase())
                    )
                    .map((name) => {
                      const mg = getMuscleGroup(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                          onMouseDown={() => {
                            onExerciseNameChange(name);
                            setShowExerciseDropdown(false);
                          }}
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
          </div>
        </CardHeader>

        {/* Show exercise history */}
        <ExerciseHistoryPreview
          exerciseName={exerciseName}
          spreadsheetId={spreadsheetId}
          sheetName={sheetName}
        />

        <CardContent>
          {/* Warmup */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Warmup
            </label>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                className="flex-1 h-12 text-base font-semibold"
                onClick={() => openModal("warmup", "weight", warmup.weight)}
              >
                {warmup.weight === 0 ? "BW" : `${warmup.weight}kg`}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 text-base font-semibold"
                onClick={() => openModal("warmup", "reps", warmup.reps)}
              >
                {warmup.reps || "0"} reps
              </Button>
            </div>
          </div>

          {/* Working sets */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Working Sets
            </label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {sets.map((set, setIndex) => (
                <div key={setIndex} className="space-y-1">
                  <div className="text-[10px] text-center text-muted-foreground">
                    Set {setIndex + 1}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm px-1"
                    onClick={() => openModal(setIndex, "weight", set.weight)}
                  >
                    {set.weight === 0 ? "BW" : set.weight}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm px-1"
                    onClick={() => openModal(setIndex, "reps", set.reps)}
                  >
                    {set.reps || "0"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Save and Reset buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              className="flex-1"
              onClick={onSave}
              disabled={isSaving || !exerciseName.trim()}
            >
              {isSaving ? (
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
          </div>
        </CardContent>
      </Card>

      {/* Modal for weight/reps input */}
      {modalState && (
        <SetInputModal
          open={modalState.open}
          onOpenChange={(open) => !open && setModalState(null)}
          type={modalState.type}
          value={modalState.value}
          onAccept={handleModalAccept}
        />
      )}
    </>
  );
}

export function LogWorkoutView({
  spreadsheetId,
  sheetName,
}: LogWorkoutViewProps) {
  // State for date selection
  const [selectedDate] = useState(() => formatDate(new Date()));
  const [selectedDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay();
    return DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
  });

  // Fetch saved workouts for the selected date
  const { data: savedWorkout } = useWorkoutByDate(
    selectedDate,
    spreadsheetId,
    sheetName
  );

  // State for the current unsaved exercise
  const [showUnsavedExercise, setShowUnsavedExercise] = useState(true);
  const [unsavedExercise, setUnsavedExercise] = useState({
    name: "",
    warmup: { weight: 0, reps: 0 },
    sets: [
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
    ],
  });

  // Save workout mutation
  const saveMutation = useAddWorkoutEntries(spreadsheetId, sheetName);

  const resetUnsavedExercise = () => {
    setUnsavedExercise({
      name: "",
      warmup: { weight: 0, reps: 0 },
      sets: [
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
      ],
    });
  };

  const handleSave = () => {
    if (!unsavedExercise.name.trim()) {
      return;
    }

    const entry: WorkoutLogEntry = {
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
    };

    if (entry.sets.length === 0 && !entry.warmup) {
      return;
    }

    saveMutation.mutate([entry], {
      onSuccess: () => {
        resetUnsavedExercise();
        setShowUnsavedExercise(false);
      },
    });
  };

  const handleAddAnotherExercise = () => {
    resetUnsavedExercise();
    setShowUnsavedExercise(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Date selector */}
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
                readOnly
                className="mt-1 bg-muted cursor-not-allowed"
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

      {/* Saved exercises (read-only) */}
      {savedWorkout?.exercises && savedWorkout.exercises.length > 0 && (
        <>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Saved Exercises
          </div>
          {savedWorkout.exercises.map((exercise) => (
            <SavedExerciseCard
              key={exercise.id}
              exerciseName={exercise.name}
              sets={exercise.sets}
            />
          ))}
        </>
      )}

      {/* Unsaved exercise form */}
      {showUnsavedExercise ? (
        <>
          {savedWorkout?.exercises && savedWorkout.exercises.length > 0 && (
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mt-6">
              Add New Exercise
            </div>
          )}
          <UnsavedExerciseCard
            exerciseName={unsavedExercise.name}
            onExerciseNameChange={(name) =>
              setUnsavedExercise((prev) => ({ ...prev, name }))
            }
            warmup={unsavedExercise.warmup}
            sets={unsavedExercise.sets}
            onWarmupChange={(warmup) =>
              setUnsavedExercise((prev) => ({ ...prev, warmup }))
            }
            onSetChange={(index, set) =>
              setUnsavedExercise((prev) => {
                const newSets = [...prev.sets];
                newSets[index] = set;
                return { ...prev, sets: newSets };
              })
            }
            onSave={handleSave}
            onReset={resetUnsavedExercise}
            isSaving={saveMutation.isPending}
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
          />
        </>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddAnotherExercise}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Exercise
        </Button>
      )}

      {saveMutation.isError && (
        <p className="text-sm text-destructive text-center">
          Failed to save: {(saveMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
