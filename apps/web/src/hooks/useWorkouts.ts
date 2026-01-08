import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbWorkoutsApi, analyticsApi } from "@/lib/api";
import { toast } from "sonner";

// Workouts hooks
export function useWorkouts() {
  return useQuery({
    queryKey: ["workouts"],
    queryFn: dbWorkoutsApi.getAll,
  });
}

export function useWorkoutByDate(date: string) {
  return useQuery({
    queryKey: ["workouts", "date", date],
    queryFn: async () => {
      const allWorkouts = await dbWorkoutsApi.getAll();
      return allWorkouts.find((w) => w.date === date) || null;
    },
    enabled: !!date,
  });
}

export function useExerciseList() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const allWorkouts = await dbWorkoutsApi.getAll();
      const exerciseSet = new Set<string>();
      allWorkouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
          exerciseSet.add(exercise.name);
        });
      });
      return Array.from(exerciseSet).sort();
    },
  });
}

export function useExerciseHistory(name: string) {
  return useQuery({
    queryKey: ["exercise", name, "history"],
    queryFn: async () => {
      const allWorkouts = await dbWorkoutsApi.getAll();
      const exerciseHistory = allWorkouts
        .map((workout) => {
          const exercise = workout.exercises.find(
            (e) => e.name.toLowerCase() === name.toLowerCase()
          );
          if (!exercise) return null;

          return {
            date: workout.date,
            sets: exercise.sets,
          };
        })
        .filter((item) => item !== null);

      return {
        exerciseName: name,
        history: exerciseHistory,
      };
    },
    enabled: !!name,
  });
}

// Analytics hooks
export function useBestSets(days = 30) {
  return useQuery({
    queryKey: ["analytics", "bestSets", days],
    queryFn: () => analyticsApi.getBestSets(days),
  });
}

export function useExerciseTrends(name: string) {
  return useQuery({
    queryKey: ["analytics", "trends", name],
    queryFn: () => analyticsApi.getExerciseTrends(name),
    enabled: !!name,
  });
}

export function useExerciseStats(name: string) {
  return useQuery({
    queryKey: ["analytics", "stats", name],
    queryFn: () => analyticsApi.getExerciseStats(name),
    enabled: !!name,
  });
}

export function useVolumeHistory() {
  return useQuery({
    queryKey: ["analytics", "volumeHistory"],
    queryFn: () => analyticsApi.getVolumeHistory(),
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.getSummary(),
  });
}

// Workout mutations
export function useAddWorkoutEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dbWorkoutsApi.addEntries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Workout saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, exerciseId }: { date: string; exerciseId: string }) =>
      dbWorkoutsApi.deleteExercise(date, exerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Exercise deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
