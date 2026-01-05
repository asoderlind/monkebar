import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
  RotateCcw,
  FileCheck,
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

  const knownExercises = Object.keys(EXERCISE_MUSCLE_GROUPS);

  // Fetch exercise history
  const { data: historyData } = useExerciseHistory(
    exerciseName,
    spreadsheetId,
    sheetName
  );

  // Get last session data
  const lastSession =
    historyData?.history && historyData.history.length > 0
      ? [...historyData.history].sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

  const lastWarmup = lastSession?.sets.find((s) => s.isWarmup);
  const lastWorkingSets = lastSession?.sets.filter((s) => !s.isWarmup) || [];

  // Calculate volume diff for a set
  const calculateDiff = (
    currentWeight: number,
    currentReps: number,
    lastWeight: number,
    lastReps: number
  ) => {
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
  };

  const openModal = (
    setIndex: number | "warmup",
    field: "weight" | "reps",
    value: number
  ) => {
    // Pre-fill with last session value if available and current value is 0
    let initialValue = value;
    if (value === 0 && lastSession) {
      if (setIndex === "warmup" && lastWarmup) {
        initialValue = field === "weight" ? lastWarmup.weight : lastWarmup.reps;
      } else if (typeof setIndex === "number" && lastWorkingSets[setIndex]) {
        initialValue =
          field === "weight"
            ? lastWorkingSets[setIndex].weight
            : lastWorkingSets[setIndex].reps;
      }
    }

    setModalState({
      open: true,
      type: field,
      setIndex,
      field,
      value: initialValue,
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
          </div>
        </CardHeader>

        <CardContent>
          {/* Warmup */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium min-w-[80px]">Warmup</span>
              <Button
                variant="outline"
                className="flex-1 h-12 text-base font-semibold"
                onClick={() => openModal("warmup", "weight", warmup.weight)}
                disabled={!exerciseName.trim()}
              >
                {warmup.weight === 0 && lastWarmup ? (
                  <span className="!text-gray-400">
                    {lastWarmup.weight === 0 ? "BW" : `${lastWarmup.weight}kg`}
                  </span>
                ) : warmup.weight === 0 ? (
                  "BW"
                ) : (
                  `${warmup.weight}kg`
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 text-base font-semibold"
                onClick={() => openModal("warmup", "reps", warmup.reps)}
                disabled={!exerciseName.trim()}
              >
                {warmup.reps === 0 && lastWarmup ? (
                  <span className="!text-gray-400">
                    {lastWarmup.reps || "0"}
                  </span>
                ) : (
                  warmup.reps || "0"
                )}
              </Button>
              <div className="w-12 text-xs text-center">
                {lastWarmup ? (
                  (() => {
                    const diff = calculateDiff(
                      warmup.weight,
                      warmup.reps,
                      lastWarmup.weight,
                      lastWarmup.reps
                    );
                    if (diff === null)
                      return <span className="text-muted-foreground">0</span>;
                    const isBodyweight =
                      warmup.weight === 0 && lastWarmup.weight === 0;
                    return (
                      <span
                        className={
                          diff > 0
                            ? "text-green-500"
                            : diff < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }
                      >
                        {diff > 0 ? "+" : ""}
                        {diff}
                        {isBodyweight ? "" : "kg"}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </div>
            </div>
          </div>

          {/* Working sets */}
          <div className="space-y-2">
            {sets.map((set, setIndex) => {
              const lastSet = lastWorkingSets[setIndex];
              return (
                <div key={setIndex} className="flex items-center gap-2">
                  <span className="text-sm font-medium min-w-[80px]">
                    Set {setIndex + 1}
                  </span>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                    onClick={() => openModal(setIndex, "weight", set.weight)}
                    disabled={!exerciseName.trim()}
                  >
                    {set.weight === 0 && lastSet ? (
                      <span className="!text-gray-400">
                        {lastSet.weight === 0 ? "BW" : lastSet.weight}
                      </span>
                    ) : set.weight === 0 ? (
                      "BW"
                    ) : (
                      set.weight
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                    onClick={() => openModal(setIndex, "reps", set.reps)}
                    disabled={!exerciseName.trim()}
                  >
                    {set.reps === 0 && lastSet ? (
                      <span className="!text-gray-400">
                        {lastSet.reps || "0"}
                      </span>
                    ) : (
                      set.reps || "0"
                    )}
                  </Button>
                  <div className="w-12 text-xs text-center">
                    {lastSet ? (
                      (() => {
                        const diff = calculateDiff(
                          set.weight,
                          set.reps,
                          lastSet.weight,
                          lastSet.reps
                        );
                        if (diff === null)
                          return (
                            <span className="text-muted-foreground">0</span>
                          );
                        const isBodyweight =
                          set.weight === 0 && lastSet.weight === 0;
                        return (
                          <span
                            className={
                              diff > 0
                                ? "text-green-500"
                                : diff < 0
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}
                            {isBodyweight ? "" : "kg"}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </div>
                </div>
              );
            })}
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

  // State for the current unsaved exercise with localStorage persistence
  const [draftData, setDraftData] = useLocalStorage<{
    exercise: {
      name: string;
      warmup: { weight: number; reps: number };
      sets: Array<{ weight: number; reps: number }>;
    };
    timestamp: number;
  } | null>("workout-draft", null);

  // Check if draft is older than 24 hours and clear it
  useEffect(() => {
    if (draftData && draftData.timestamp) {
      const age = Date.now() - draftData.timestamp;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (age > twentyFourHours) {
        setDraftData(null);
      }
    }
  }, [draftData, setDraftData]);

  // Initialize unsavedExercise from draft or default
  const initialExercise = {
    name: "",
    warmup: { weight: 0, reps: 0 },
    sets: [
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
      { weight: 0, reps: 0 },
    ],
  };

  const [unsavedExercise, setUnsavedExerciseState] = useState(
    draftData?.exercise || initialExercise
  );

  // Update localStorage whenever unsavedExercise changes
  const setUnsavedExercise = (
    update:
      | typeof initialExercise
      | ((prev: typeof initialExercise) => typeof initialExercise)
  ) => {
    setUnsavedExerciseState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      // Save to localStorage with timestamp
      setDraftData({
        exercise: next,
        timestamp: Date.now(),
      });
      return next;
    });
  };

  // Track if there's any draft content
  const hasDraftContent =
    unsavedExercise.name.trim() !== "" ||
    unsavedExercise.warmup.weight > 0 ||
    unsavedExercise.warmup.reps > 0 ||
    unsavedExercise.sets.some((s) => s.weight > 0 || s.reps > 0);

  // Save workout mutation
  const saveMutation = useAddWorkoutEntries(spreadsheetId, sheetName);

  const resetUnsavedExercise = () => {
    const emptyExercise = {
      name: "",
      warmup: { weight: 0, reps: 0 },
      sets: [
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
      ],
    };
    setUnsavedExerciseState(emptyExercise);
    setDraftData(null);
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
      },
    });
  };

  // Format date for header: "Sunday Jan 4th"
  const formatDateHeader = () => {
    const date = new Date(selectedDate);
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
  };

  return (
    <div className="p-4 space-y-4">
      {/* Large Date Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{formatDateHeader()}</h1>
        {hasDraftContent && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCheck className="h-4 w-4" />
            <span>Draft saved</span>
          </div>
        )}
      </div>

      {/* Unsaved exercise form */}
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

      {/* Saved exercises (read-only) */}
      {savedWorkout?.exercises && savedWorkout.exercises.length > 0 && (
        <>
          {savedWorkout.exercises.map((exercise) => (
            <SavedExerciseCard
              key={exercise.id}
              exerciseName={exercise.name}
              sets={exercise.sets}
            />
          ))}
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
