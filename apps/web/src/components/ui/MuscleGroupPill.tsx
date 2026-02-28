import { Dumbbell, Heart } from "lucide-react";
import type { MuscleGroup } from "@monke-bar/shared";
import { MUSCLE_GROUP_COLORS } from "@monke-bar/shared";

export function MuscleGroupPill({ muscleGroup }: { muscleGroup: string }) {
  const isHeart = muscleGroup === "Heart";
  const PillIcon = isHeart ? Heart : Dumbbell;
  const colorClass = isHeart
    ? "bg-red-500/20 text-red-700 dark:text-red-400"
    : MUSCLE_GROUP_COLORS[muscleGroup as MuscleGroup] || "bg-muted text-muted-foreground";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${colorClass}`}>
      <PillIcon className="h-3 w-3" />
      {muscleGroup}
    </span>
  );
}
