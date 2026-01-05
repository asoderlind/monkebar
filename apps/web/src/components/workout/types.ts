export interface SetInput {
  weight: number;
  reps: number;
}

export interface ExerciseDraft {
  name: string;
  warmup: SetInput;
  sets: SetInput[];
}

export interface WorkoutDraft {
  exercise: ExerciseDraft;
  exercise2?: ExerciseDraft;
  supersetMode: boolean;
  timestamp: number;
}

export const createEmptyExercise = (): ExerciseDraft => ({
  name: "",
  warmup: { weight: 0, reps: 0 },
  sets: [
    { weight: 0, reps: 0 },
    { weight: 0, reps: 0 },
    { weight: 0, reps: 0 },
    { weight: 0, reps: 0 },
  ],
});
