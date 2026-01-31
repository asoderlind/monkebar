import { useState, useMemo, useRef, useEffect } from "react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDayOfWeek, type Workout } from "@monke-bar/shared";
import { MuscleGroupCalendar } from "@/components/MuscleGroupCalendar";

interface GroupedDay {
  date: string;
  workout: Workout;
}

export function HistoryView() {
  const { data: workouts, isLoading } = useWorkouts();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const workoutCardRef = useRef<HTMLDivElement>(null);

  // Group workouts by day (one workout per day)
  const groupedDays = useMemo((): GroupedDay[] => {
    if (!workouts) return [];

    return workouts
      .map((workout) => ({
        date: workout.date,
        workout,
      }))
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        return b.date.localeCompare(a.date);
      });
  }, [workouts]);

  // Find the selected day's workout
  const selectedDayWorkout = useMemo(() => {
    if (!selectedDate) return null;
    return groupedDays.find((day) => day.date === selectedDate) ?? null;
  }, [selectedDate, groupedDays]);

  // Scroll to workout card when a date is selected
  useEffect(() => {
    if (selectedDate && workoutCardRef.current) {
      workoutCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  const handleDateSelect = (date: string) => {
    // Check if this date has a workout
    const hasWorkout = groupedDays.some((day) => day.date === date);
    if (hasWorkout) {
      setSelectedDate(date);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading history...
        </div>
      </div>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No workout history found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Muscle Group Calendar */}
      <MuscleGroupCalendar
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate}
      />

      {/* Selected Day Workout Card */}
      {selectedDayWorkout && (
        <div ref={workoutCardRef}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-center">
                <span>
                  {getDayOfWeek(selectedDayWorkout.date)} ({selectedDayWorkout.date})
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {selectedDayWorkout.workout.exercises.length} exercises
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {selectedDayWorkout.workout.exercises.map((exercise, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-secondary/30">
                    <p className="font-medium text-sm mb-1">{exercise.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {exercise.sets.map((set) => (
                        <span
                          key={set.setNumber}
                          className={`text-xs px-2 py-0.5 rounded ${
                            set.isWarmup
                              ? "bg-muted text-muted-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          {set.weight === 0
                            ? `${set.reps}`
                            : `${set.weight}×${set.reps}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
