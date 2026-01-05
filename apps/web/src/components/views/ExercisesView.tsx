import { useState } from "react";
import {
  useExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
} from "@/hooks/useExercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Dumbbell } from "lucide-react";
import type { ExerciseMaster, MuscleGroup } from "@monke-bar/shared";
import { MUSCLE_GROUPS, MUSCLE_GROUP_COLORS } from "@monke-bar/shared";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExercisesView() {
  const { data: exercises, isLoading, error } = useExercises();
  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();
  const deleteMutation = useDeleteExercise();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseMaster | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    muscleGroup: "" as MuscleGroup | "",
  });

  const resetForm = () => {
    setFormData({ name: "", muscleGroup: "" });
    setSelectedExercise(null);
  };

  const handleAdd = () => {
    setIsAddDialogOpen(true);
    resetForm();
  };

  const handleEdit = (exercise: ExerciseMaster) => {
    setSelectedExercise(exercise);
    setFormData({
      name: exercise.name,
      muscleGroup: (exercise.muscleGroup as MuscleGroup) || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (exercise: ExerciseMaster) => {
    setSelectedExercise(exercise);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await createMutation.mutateAsync({
      name: formData.name.trim(),
      muscleGroup: formData.muscleGroup || undefined,
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise || !formData.name.trim()) return;

    await updateMutation.mutateAsync({
      id: selectedExercise.id,
      data: {
        name: formData.name.trim(),
        muscleGroup: formData.muscleGroup || null,
      },
    });

    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleSubmitDelete = async () => {
    if (!selectedExercise) return;

    await deleteMutation.mutateAsync(selectedExercise.id);
    setIsDeleteDialogOpen(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading exercises...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive">
              Failed to load exercises. {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group exercises by muscle group
  const groupedExercises = exercises?.reduce((acc, exercise) => {
    const group = exercise.muscleGroup || "Uncategorized";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(exercise);
    return acc;
  }, {} as Record<string, ExerciseMaster[]>);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Exercises</h1>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>
      </div>

      {/* Exercise List */}
      {!exercises || exercises.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No exercises found. Add your first exercise to get started.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExercises || {})
            .sort(([a], [b]) => {
              // Sort muscle groups, with "Uncategorized" last
              if (a === "Uncategorized") return 1;
              if (b === "Uncategorized") return -1;
              return a.localeCompare(b);
            })
            .map(([muscleGroup, groupExercises]) => (
              <Card key={muscleGroup}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-md text-sm font-medium ${
                        MUSCLE_GROUP_COLORS[muscleGroup as MuscleGroup] ||
                        "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {muscleGroup}
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      ({groupExercises.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groupExercises
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="font-medium">{exercise.name}</div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(exercise)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exercise)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitAdd}>
            <DialogHeader>
              <DialogTitle>Add New Exercise</DialogTitle>
              <DialogDescription>
                Create a new exercise to track in your workouts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium leading-none"
                >
                  Exercise Name
                </label>
                <Input
                  id="name"
                  placeholder="e.g., Bench Press"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="muscleGroup"
                  className="text-sm font-medium leading-none"
                >
                  Muscle Group
                </label>
                <select
                  id="muscleGroup"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.muscleGroup}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      muscleGroup: e.target.value as MuscleGroup | "",
                    })
                  }
                >
                  <option value="">Select muscle group</option>
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Exercise"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitEdit}>
            <DialogHeader>
              <DialogTitle>Edit Exercise</DialogTitle>
              <DialogDescription>
                Update the exercise name or muscle group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="edit-name"
                  className="text-sm font-medium leading-none"
                >
                  Exercise Name
                </label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Bench Press"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="edit-muscleGroup"
                  className="text-sm font-medium leading-none"
                >
                  Muscle Group
                </label>
                <select
                  id="edit-muscleGroup"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.muscleGroup}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      muscleGroup: e.target.value as MuscleGroup | "",
                    })
                  }
                >
                  <option value="">Select muscle group</option>
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedExercise?.name}"? This
              action can be undone, but the exercise will be hidden from the
              list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
