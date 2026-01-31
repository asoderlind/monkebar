import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { measurementsApi } from "@/lib/api";
import { toast } from "sonner";
import type { NewMeasurement } from "@monke-bar/shared";

/**
 * Hook to fetch all measurements, optionally filtered by type
 */
export function useMeasurements(type?: string) {
  return useQuery({
    queryKey: ["measurements", type],
    queryFn: () => measurementsApi.getAll(type),
  });
}

/**
 * Hook to fetch weight measurements specifically
 */
export function useWeightMeasurements() {
  return useMeasurements("weight");
}

/**
 * Hook to fetch a single measurement by ID
 */
export function useMeasurement(id: number) {
  return useQuery({
    queryKey: ["measurements", id],
    queryFn: () => measurementsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new measurement
 */
export function useCreateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewMeasurement) => measurementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement saved!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save measurement");
    },
  });
}

/**
 * Hook to update an existing measurement
 */
export function useUpdateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<NewMeasurement>;
    }) => measurementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update measurement");
    },
  });
}

/**
 * Hook to delete a measurement
 */
export function useDeleteMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => measurementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement deleted!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete measurement");
    },
  });
}
