import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Loader2, RotateCcw, Save } from "lucide-react";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseHistory } from "@/hooks/useWorkouts";
import {
  MUSCLE_GROUP_COLORS,
  type MuscleGroup,
  type WorkoutSet,
} from "@monke-bar/shared";
import { SetInputModal } from "./SetInputModal";
import { calculateDiffWithOverload } from "./utils";
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
  warmup: SetInput;
  sets: SetInput[];
  onWarmupChange: (warmup: SetInput) => void;
  onSetChange: (index: number, set: SetInput) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  spreadsheetId: string;
  sheetName: string;
  showSaveButton?: boolean;
}

export function UnsavedExerciseCard({
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
  showSaveButton = true,
}: UnsavedExerciseCardProps) {
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: "weight" | "reps";
    setIndex: number | "warmup";
    field: "weight" | "reps";
    value: number;
  } | null>(null);

  // Fetch exercises from database
  const { data: exercisesData } = useExercises();
  const knownExercises = exercisesData?.map((ex) => ex.name) || [];

  // Create a lookup map for exercise muscle groups
  const exerciseMuscleGroupMap =
    exercisesData?.reduce((acc, ex) => {
      if (ex.muscleGroup) {
        acc[ex.name] = ex.muscleGroup;
      }
      return acc;
    }, {} as Record<string, MuscleGroup>) || {};

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
  console.log("Last session:", lastSession);
  console.log("Last warmup:", lastWarmup);
  console.log("Last working sets:", lastWorkingSets);

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
      } else if (typeof setIndex === "number") {
        // Use setNumber property (1-4) instead of array index (0-3)
        const lastSet = findWorkingSetByNumber(lastWorkingSets, setIndex + 1);
        if (lastSet) {
          initialValue = field === "weight" ? lastSet.weight : lastSet.reps;
        }
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
                      const mg = exerciseMuscleGroupMap[name];
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
                    const diffResult = calculateDiffWithOverload(
                      warmup.weight,
                      warmup.reps,
                      lastWarmup.weight,
                      lastWarmup.reps
                    );
                    if (diffResult.displayValue === null)
                      return <span className="text-muted-foreground">0</span>;
                    const isBodyweight =
                      warmup.weight === 0 && lastWarmup.weight === 0;
                    const isPositive = diffResult.isProgressiveOverload || (diffResult.value !== null && diffResult.value > 0);
                    const isNegative = !diffResult.isProgressiveOverload && diffResult.value !== null && diffResult.value < 0;
                    return (
                      <span
                        className={
                          isPositive
                            ? "text-green-500"
                            : isNegative
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }
                      >
                        {isPositive ? "+" : ""}
                        {diffResult.displayValue}
                        {isBodyweight || diffResult.isProgressiveOverload ? "" : "kg"}
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
              // Use setNumber property (1-4) instead of array index (0-3)
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
                        const diffResult = calculateDiffWithOverload(
                          set.weight,
                          set.reps,
                          lastSet.weight,
                          lastSet.reps
                        );
                        if (diffResult.displayValue === null)
                          return (
                            <span className="text-muted-foreground">0</span>
                          );
                        const isBodyweight =
                          set.weight === 0 && lastSet.weight === 0;
                        const isPositive = diffResult.isProgressiveOverload || (diffResult.value !== null && diffResult.value > 0);
                        const isNegative = !diffResult.isProgressiveOverload && diffResult.value !== null && diffResult.value < 0;
                        return (
                          <span
                            className={
                              isPositive
                                ? "text-green-500"
                                : isNegative
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }
                          >
                            {isPositive ? "+" : ""}
                            {diffResult.displayValue}
                            {isBodyweight || diffResult.isProgressiveOverload ? "" : "kg"}
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

          {/* Save button */}
          {showSaveButton && (
            <div className="mt-4">
              <Button
                className="w-full"
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
          )}
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
