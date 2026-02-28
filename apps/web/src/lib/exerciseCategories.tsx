import { Dumbbell, Heart, PersonStanding } from "lucide-react";
import { EXERCISE_CATEGORIES, type ExerciseCategory } from "@monke-bar/shared";

export const EXERCISE_CATEGORY_CONFIG = EXERCISE_CATEGORIES.map((cat) => ({
  cat,
  icon:
    cat === "Strength"
      ? Dumbbell
      : cat === "Cardio"
        ? Heart
        : PersonStanding,
})) satisfies { cat: ExerciseCategory; icon: React.ElementType }[];
