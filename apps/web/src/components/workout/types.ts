import type { ExerciseCategory } from "@monke-bar/shared";

export interface SetInput {
  weight: number;
  reps: number;
}

export interface ExerciseDraft {
  name: string;
  category: ExerciseCategory;
  warmup: SetInput;
  sets: SetInput[];
  cardioDuration: number; // minutes (UI); converted to seconds on save
  cardioLevel: number | null;
  cardioDistance: number | null; // km
}

export interface WorkoutDraft {
  exercise: ExerciseDraft;
  exercise2?: ExerciseDraft;
  supersetMode: boolean;
  timestamp: number;
}

export const createEmptyExercise = (): ExerciseDraft => ({
  name: "",
  category: "Strength",
  warmup: { weight: 0, reps: 0 },
  sets: [
    { weight: 0, reps: 0 },
    { weight: 0, reps: 0 },
    { weight: 0, reps: 0 },
    { weight: 0, reps: 0 },
  ],
  cardioDuration: 0,
  cardioLevel: null,
  cardioDistance: null,
});
