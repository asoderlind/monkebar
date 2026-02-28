import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Loader2, RotateCcw, Save } from "lucide-react";
import { EXERCISE_CATEGORY_CONFIG } from "@/lib/exerciseCategories";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseHistory } from "@/hooks/useWorkouts";
import {
  MUSCLE_GROUP_COLORS,
  type MuscleGroup,
  type ExerciseCategory,
  type WorkoutSet,
} from "@monke-bar/shared";
import { SetInputModal } from "./SetInputModal";
import { calculateDiff } from "./utils";
import type { SetInput } from "./types";

/**
 * Type-safe helper to find a working set by its setNumber property.
 * Prevents index mismatches by using the set's actual setNumber (1-4) instead of array position.
 * @param sets - Array of WorkoutSet objects (should not include warmup)
 * @param setNumber - The set number to find (1-4)
 * @returns The matching WorkoutSet or undefined if not found
 */
function findWorkingSetByNumber(
  sets: WorkoutSet[],
  setNumber: number
): WorkoutSet | undefined {
  return sets.find((s) => s.setNumber === setNumber);
}

interface UnsavedExerciseCardProps {
  exerciseName: string;
  onExerciseNameChange: (name: string) => void;
  category: ExerciseCategory;
  onCategoryChange: (category: ExerciseCategory) => void;
  warmup: SetInput;
  sets: SetInput[];
  onWarmupChange: (warmup: SetInput) => void;
  onSetChange: (index: number, set: SetInput) => void;
  cardioDuration: number;
  cardioLevel: number | null;
  cardioDistance: number | null;
  onCardioDurationChange: (v: number) => void;
  onCardioLevelChange: (v: number | null) => void;
  onCardioDistanceChange: (v: number | null) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  showSaveButton?: boolean;
}

export function UnsavedExerciseCard({
  exerciseName,
  onExerciseNameChange,
  category,
  onCategoryChange,
  warmup,
  sets,
  onWarmupChange,
  onSetChange,
  cardioDuration,
  cardioLevel,
  cardioDistance,
  onCardioDurationChange,
  onCardioLevelChange,
  onCardioDistanceChange,
  onSave,
  onReset,
  isSaving,
  showSaveButton = true,
}: UnsavedExerciseCardProps) {
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [exerciseSelected, setExerciseSelected] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: "weight" | "reps";
    label?: string;
    target:
      | { kind: "strength"; setIndex: number | "warmup"; field: "weight" | "reps" }
      | { kind: "cardioDuration" }
      | { kind: "cardioLevel" }
      | { kind: "cardioDistance" };
    value: number;
  } | null>(null);

  // Fetch exercises from database
  const { data: exercisesData } = useExercises();

  // Filter exercises by selected category
  const filteredExercises =
    exercisesData?.filter((ex) => ex.category === category) ?? [];

  // Create a lookup map for exercise muscle groups
  const exerciseMuscleGroupMap =
    exercisesData?.reduce((acc, ex) => {
      if (ex.muscleGroup) {
        acc[ex.name] = ex.muscleGroup;
      }
      return acc;
    }, {} as Record<string, MuscleGroup>) || {};

  // Fetch exercise history
  const { data: historyData } = useExerciseHistory(exerciseName);

  // Get last session data
  const lastSession =
    historyData?.history && historyData.history.length > 0
      ? [...historyData.history].sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

  const lastWarmup = lastSession?.sets.find((s) => s.isWarmup);
  const lastWorkingSets = lastSession?.sets.filter((s) => !s.isWarmup) || [];

  const handleSelectExercise = (name: string) => {
    onExerciseNameChange(name);
    setShowExerciseDropdown(false);
    setExerciseSelected(true);
    // Auto-switch category if the picked exercise belongs to a different one
    const picked = exercisesData?.find((ex) => ex.name === name);
    if (picked && picked.category !== category) {
      onCategoryChange(picked.category as ExerciseCategory);
    }
  };

  // Open modal for strength fields
  const openStrengthModal = (
    setIndex: number | "warmup",
    field: "weight" | "reps",
    value: number
  ) => {
    let initialValue = value;
    if (value === 0 && lastSession) {
      if (setIndex === "warmup" && lastWarmup) {
        initialValue = field === "weight" ? lastWarmup.weight : lastWarmup.reps;
      } else if (typeof setIndex === "number") {
        const lastSet = findWorkingSetByNumber(lastWorkingSets, setIndex + 1);
        if (lastSet) {
          initialValue = field === "weight" ? lastSet.weight : lastSet.reps;
        }
      }
    }
    setModalState({
      open: true,
      type: field === "weight" ? "weight" : "reps",
      target: { kind: "strength", setIndex, field },
      value: initialValue,
    });
  };

  const CARDIO_MODAL_CONFIG = {
    cardioDuration: { type: "reps" as const, label: "Set Duration (min)" },
    cardioLevel: { type: "reps" as const, label: "Set Level" },
    cardioDistance: { type: "weight" as const, label: "Set Distance (km)" },
  };

  const openCardioModal = (
    kind: "cardioDuration" | "cardioLevel" | "cardioDistance",
    currentValue: number | null
  ) => {
    const { type, label } = CARDIO_MODAL_CONFIG[kind];
    setModalState({
      open: true,
      type,
      label,
      target: { kind },
      value: currentValue ?? 0,
    });
  };

  const handleModalAccept = (newValue: number) => {
    if (!modalState) return;
    const { target } = modalState;

    if (target.kind === "strength") {
      if (target.setIndex === "warmup") {
        onWarmupChange({ ...warmup, [target.field]: newValue });
      } else {
        const setIndex = target.setIndex;
        onSetChange(setIndex, { ...sets[setIndex], [target.field]: newValue });
      }
    } else if (target.kind === "cardioDuration") {
      onCardioDurationChange(newValue);
    } else if (target.kind === "cardioLevel") {
      onCardioLevelChange(newValue === 0 ? null : newValue);
    } else if (target.kind === "cardioDistance") {
      onCardioDistanceChange(newValue === 0 ? null : newValue);
    }

    setModalState(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          {/* Category button group */}
          <div className="flex gap-1 mb-2">
            {EXERCISE_CATEGORY_CONFIG.map(({ cat, icon: Icon }) => (
              <Button
                key={cat}
                variant={category === cat ? "secondary" : "ghost"}
                size="sm"
                className={
                  category === cat
                    ? "flex-1 text-xs gap-1 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    : "flex-1 text-xs gap-1"
                }
                onClick={() => {
                  onCategoryChange(cat);
                  onExerciseNameChange("");
                  setExerciseSelected(false);
                }}
              >
                <Icon className="h-3 w-3" />
                {cat}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Exercise name"
                value={exerciseName}
                onChange={(e) => {
                  onExerciseNameChange(e.target.value);
                  setExerciseSelected(false);
                }}
                onFocus={() => setShowExerciseDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowExerciseDropdown(false), 200)
                }
                className="pr-8"
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              {/* Exercise dropdown — filtered by category */}
              {showExerciseDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredExercises
                    .filter((ex) =>
                      ex.name
                        .toLowerCase()
                        .includes(exerciseName.toLowerCase())
                    )
                    .map((ex) => {
                      const mg = exerciseMuscleGroupMap[ex.name];
                      return (
                        <button
                          key={ex.name}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                          onMouseDown={() => handleSelectExercise(ex.name)}
                        >
                          {ex.name}
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
            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {!exerciseSelected ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Choose an exercise above to log sets
            </p>
          ) : category === "Cardio" ? (
            /* Cardio input: duration + level + distance */
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium min-w-[80px]">
                  Duration
                </span>
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() =>
                    openCardioModal("cardioDuration", cardioDuration)
                  }
                >
                  {cardioDuration > 0 ? `${cardioDuration} min` : "0 min"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium min-w-[80px]">Level</span>
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => openCardioModal("cardioLevel", cardioLevel)}
                >
                  {cardioLevel != null ? cardioLevel : "—"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium min-w-[80px]">
                  Distance
                </span>
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() =>
                    openCardioModal("cardioDistance", cardioDistance)
                  }
                >
                  {cardioDistance != null ? `${cardioDistance} km` : "—"}
                </Button>
              </div>
            </div>
          ) : (
            /* Strength / Calisthenics: warmup + working sets */
            <>
              {/* Warmup */}
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium min-w-[80px]">
                    Warmup
                  </span>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                    onClick={() =>
                      openStrengthModal("warmup", "weight", warmup.weight)
                    }
                    >
                    {warmup.weight === 0 && lastWarmup ? (
                      <span className="!text-gray-400">
                        {`${lastWarmup.weight}kg`}
                      </span>
                    ) : (
                      `${warmup.weight}kg`
                    )}
                  </Button>
                  x
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                    onClick={() =>
                      openStrengthModal("warmup", "reps", warmup.reps)
                    }
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
                          return (
                            <span className="text-muted-foreground">0</span>
                          );
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
                  const lastSet = findWorkingSetByNumber(
                    lastWorkingSets,
                    setIndex + 1
                  );
                  return (
                    <div key={setIndex} className="flex items-center gap-2">
                      <span className="text-sm font-medium min-w-[80px]">
                        Set {setIndex + 1}
                      </span>
                      <Button
                        variant="outline"
                        className="flex-1 h-12 text-base font-semibold"
                        onClick={() =>
                          openStrengthModal(setIndex, "weight", set.weight)
                        }
                            >
                        {set.weight === 0 && lastSet ? (
                          <span className="!text-gray-400">
                            {lastSet.weight}kg
                          </span>
                        ) : (
                          `${set.weight}kg`
                        )}
                      </Button>
                      x
                      <Button
                        variant="outline"
                        className="flex-1 h-12 text-base font-semibold"
                        onClick={() =>
                          openStrengthModal(setIndex, "reps", set.reps)
                        }
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
            </>
          )}

          {/* Save button */}
          {showSaveButton && (
            <div className="mt-4">
              <Button
                className="w-full"
                onClick={onSave}
                disabled={isSaving || !exerciseSelected}
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
          )}
        </CardContent>
      </Card>

      {/* Modal for value input */}
      {modalState && (
        <SetInputModal
          open={modalState.open}
          onOpenChange={(open) => !open && setModalState(null)}
          type={modalState.type}
          label={modalState.label}
          value={modalState.value}
          onAccept={handleModalAccept}
        />
      )}
    </>
  );
}
