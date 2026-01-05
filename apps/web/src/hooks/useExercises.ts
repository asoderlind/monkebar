import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exercisesApi } from "@/lib/api";
import { toast } from "sonner";
import type { NewExerciseMaster } from "@monke-bar/shared";

/**
 * Hook to fetch all exercises
 */
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: exercisesApi.getAll,
  });
}

/**
 * Hook to fetch a single exercise by ID
 */
export function useExercise(id: number) {
  return useQuery({
    queryKey: ["exercises", id],
    queryFn: () => exercisesApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new exercise
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewExerciseMaster) => exercisesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create exercise");
    },
  });
}

/**
 * Hook to update an existing exercise
 */
export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<NewExerciseMaster>;
    }) => exercisesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update exercise");
    },
  });
}

/**
 * Hook to delete (soft delete) an exercise
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => exercisesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete exercise");
    },
  });
}
