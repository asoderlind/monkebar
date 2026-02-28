import { Button } from "@/components/ui/button";
import { EXERCISE_CATEGORY_CONFIG } from "@/lib/exerciseCategories";
import type { ExerciseCategory } from "@monke-bar/shared";

interface CategoryButtonGroupProps {
  value: ExerciseCategory;
  onChange: (cat: ExerciseCategory) => void;
}

export function CategoryButtonGroup({ value, onChange }: CategoryButtonGroupProps) {
  return (
    <div className="flex gap-1">
      {EXERCISE_CATEGORY_CONFIG.map(({ cat, icon: Icon }) => (
        <Button
          key={cat}
          type="button"
          variant={value === cat ? "secondary" : "ghost"}
          size="sm"
          className={
            value === cat
              ? "flex-1 text-xs gap-1 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              : "flex-1 text-xs gap-1"
          }
          onClick={() => onChange(cat)}
        >
          <Icon className="h-3 w-3" />
          {cat}
        </Button>
      ))}
    </div>
  );
}
