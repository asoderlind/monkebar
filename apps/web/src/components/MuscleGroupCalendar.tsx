import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useExercises } from "@/hooks/useExercises";
import type { MuscleGroup } from "@monke-bar/shared";

// Solid background colors for the calendar cells
const MUSCLE_GROUP_SOLID_COLORS: Record<MuscleGroup, string> = {
  Chest: "#ef4444",
  Triceps: "#f97316",
  Shoulders: "#eab308",
  Biceps: "#22c55e",
  Back: "#3b82f6",
  Legs: "#a855f7",
  Core: "#ec4899",
  Heart: "#f43f5e",
};

interface MuscleGroupCalendarProps {
  onDateSelect?: (date: string) => void;
  selectedDate?: string | null;
  showLegend?: boolean;
  allowAllDates?: boolean;
  wrapped?: boolean;
  initialMonth?: string;
}

export function MuscleGroupCalendar({
  onDateSelect,
  selectedDate,
  showLegend = true,
  allowAllDates = false,
  wrapped = true,
  initialMonth,
}: MuscleGroupCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialMonth) {
      return parseISO(initialMonth);
    }
    return new Date();
  });
  const { data: workouts } = useWorkouts();
  const { data: exerciseMaster } = useExercises();

  // Create a map of exercise names to muscle groups (Cardio → "Heart")
  const exerciseToMuscleGroup = useMemo(() => {
    if (!exerciseMaster) return new Map<string, MuscleGroup>();

    const map = new Map<string, MuscleGroup>();
    exerciseMaster.forEach((exercise) => {
      if (exercise.muscleGroup) {
        map.set(exercise.name.toLowerCase(), exercise.muscleGroup as MuscleGroup);
      }
    });
    return map;
  }, [exerciseMaster]);

  // Map dates to muscle groups worked
  const dateToMuscleGroups = useMemo((): Map<string, Set<MuscleGroup>> => {
    if (!workouts || !exerciseMaster) return new Map();

    const map = new Map<string, Set<MuscleGroup>>();

    workouts.forEach((workout) => {
      const muscleGroups = new Set<MuscleGroup>();

      workout.exercises.forEach((exercise) => {
        const muscleGroup = exerciseToMuscleGroup.get(exercise.name.toLowerCase());
        if (muscleGroup) {
          muscleGroups.add(muscleGroup);
        }
      });

      if (muscleGroups.size > 0) {
        map.set(workout.date, muscleGroups);
      }
    });

    return map;
  }, [workouts, exerciseToMuscleGroup, exerciseMaster]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const calendarContent = (
    <>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, idx) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const muscleGroups = dateToMuscleGroups.get(dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const hasWorkout = muscleGroups && muscleGroups.size > 0;
          const isSelected = selectedDate === dateStr;
          const isClickable = allowAllDates || hasWorkout;

          return (
            <button
              key={idx}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onDateSelect?.(dateStr)}
              className={`
                aspect-square relative rounded-md border transition-colors
                ${isCurrentMonth ? "border-border" : "border-transparent"}
                ${isTodayDate && !isSelected ? "ring-2 ring-primary" : ""}
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isClickable ? "cursor-pointer hover:bg-secondary/50" : "cursor-default"}
                ${isSelected ? "bg-primary/20 ring-2 ring-primary" : ""}
              `}
            >
              {/* Day number */}
              <div className="absolute top-0.5 left-0.5 text-[10px] font-medium z-10">
                {format(day, "d")}
              </div>

              {/* Muscle group indicators */}
              {hasWorkout && (
                <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-1">
                  {Array.from(muscleGroups).map((muscleGroup) => (
                    <div
                      key={muscleGroup}
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: MUSCLE_GROUP_SOLID_COLORS[muscleGroup],
                      }}
                      title={muscleGroup}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Muscle Groups:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MUSCLE_GROUP_SOLID_COLORS).map(([group, color]) => (
              <div key={group} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{group}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (!wrapped) {
    return calendarContent;
  }

  return (
    <Card>
      <CardContent className="pt-6">{calendarContent}</CardContent>
    </Card>
  );
}
