import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getMuscleGroup, MUSCLE_GROUP_COLORS } from "@monke-bar/shared";

interface SavedExerciseCardProps {
  exerciseName: string;
  sets: Array<{ weight: number; reps: number; isWarmup: boolean }>;
  groupId?: string;
  groupType?: "superset";
}

export function SavedExerciseCard({
  exerciseName,
  sets,
  groupId,
  groupType,
}: SavedExerciseCardProps) {
  const muscleGroup = getMuscleGroup(exerciseName);
  const colorClass = muscleGroup ? MUSCLE_GROUP_COLORS[muscleGroup] : "";

  const warmupSet = sets.find((s) => s.isWarmup);
  const workingSets = sets.filter((s) => !s.isWarmup);

  return (
    <Card
      className={`bg-muted/30 ${groupId ? "border-l-4 border-l-blue-500" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 font-medium">{exerciseName}</div>
          {groupType === "superset" && groupId && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400">
              {groupId}
            </span>
          )}
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
