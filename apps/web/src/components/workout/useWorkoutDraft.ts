import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { ExerciseDraft, WorkoutDraft } from "./types";
import { createEmptyExercise } from "./types";

const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useWorkoutDraft() {
  const [draftData, setDraftData] = useLocalStorage<WorkoutDraft | null>(
    "workout-draft",
    null
  );

  const [supersetMode, setSupersetMode] = useState(false);
  const [unsavedExercise, setUnsavedExercise] = useState<ExerciseDraft>(
    () => draftData?.exercise || createEmptyExercise()
  );
  const [unsavedExercise2, setUnsavedExercise2] = useState<ExerciseDraft>(
    () => draftData?.exercise2 || createEmptyExercise()
  );

  // Check if draft is older than 24 hours and clear it
  useEffect(() => {
    if (draftData?.timestamp) {
      const age = Date.now() - draftData.timestamp;
      if (age > DRAFT_TTL) {
        setDraftData(null);
      }
    }
  }, [draftData, setDraftData]);

  // Restore superset mode from draft
  useEffect(() => {
    if (draftData?.supersetMode !== undefined) {
      setSupersetMode(draftData.supersetMode);
    }
  }, []); // Only on mount

  // Save to localStorage whenever state changes
  const saveDraft = useCallback(
    (exercise: ExerciseDraft, exercise2: ExerciseDraft, mode: boolean) => {
      setDraftData({
        exercise,
        exercise2: mode ? exercise2 : undefined,
        supersetMode: mode,
        timestamp: Date.now(),
      });
    },
    [setDraftData]
  );

  // Update exercise 1
  const updateExercise = useCallback(
    (update: ExerciseDraft | ((prev: ExerciseDraft) => ExerciseDraft)) => {
      setUnsavedExercise((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        saveDraft(next, unsavedExercise2, supersetMode);
        return next;
      });
    },
    [unsavedExercise2, supersetMode, saveDraft]
  );

  // Update exercise 2
  const updateExercise2 = useCallback(
    (update: ExerciseDraft | ((prev: ExerciseDraft) => ExerciseDraft)) => {
      setUnsavedExercise2((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        saveDraft(unsavedExercise, next, supersetMode);
        return next;
      });
    },
    [unsavedExercise, supersetMode, saveDraft]
  );

  // Toggle superset mode
  const toggleSupersetMode = useCallback(() => {
    setSupersetMode((prev) => {
      const newMode = !prev;
      saveDraft(unsavedExercise, unsavedExercise2, newMode);
      return newMode;
    });
  }, [unsavedExercise, unsavedExercise2, saveDraft]);

  // Reset all exercises
  const resetDraft = useCallback(() => {
    const empty = createEmptyExercise();
    setUnsavedExercise(empty);
    setUnsavedExercise2(empty);
    setDraftData(null);
  }, [setDraftData]);

  // Check if there's any draft content
  const isDraftFresh =
    draftData?.timestamp != null &&
    Date.now() - draftData.timestamp <= DRAFT_TTL;

  const hasExerciseContent = (ex: ExerciseDraft) =>
    ex.name.trim() !== "" ||
    ex.warmup.weight > 0 ||
    ex.warmup.reps > 0 ||
    ex.sets.some((s) => s.weight > 0 || s.reps > 0);

  const hasDraftContent =
    isDraftFresh &&
    (hasExerciseContent(unsavedExercise) ||
      (supersetMode && hasExerciseContent(unsavedExercise2)));

  return {
    supersetMode,
    unsavedExercise,
    unsavedExercise2,
    updateExercise,
    updateExercise2,
    toggleSupersetMode,
    resetDraft,
    hasDraftContent,
  };
}
