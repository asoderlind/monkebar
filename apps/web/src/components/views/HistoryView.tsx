import { useState, useMemo } from "react";
import { useWorkouts, useExerciseList } from "@/hooks/useWorkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { getDayOfWeek, type Workout } from "@monke-bar/shared";

interface GroupedDay {
  date: string;
  workout: Workout;
}

export function HistoryView() {
  const { data: workouts, isLoading } = useWorkouts();
  const { data: exercises } = useExerciseList();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [filterExercise, setFilterExercise] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);

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

  // Filter by exercise if selected
  const filteredDays = filterExercise
    ? groupedDays
        .map((day) => ({
          ...day,
          workout: {
            ...day.workout,
            exercises: day.workout.exercises.filter((e) =>
              e.name.toLowerCase().includes(filterExercise.toLowerCase())
            ),
          },
        }))
        .filter((day) => day.workout.exercises.length > 0)
    : groupedDays;

  const toggleDay = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search/Filter */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {filterExercise || "Filter by exercise"}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              searchOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        {searchOpen && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-secondary/30 rounded-lg">
            <Button
              variant={!filterExercise ? "default" : "ghost"}
              size="sm"
              className="justify-start text-xs"
              onClick={() => {
                setFilterExercise("");
                setSearchOpen(false);
              }}
            >
              All Exercises
            </Button>
            {exercises?.map((exercise) => (
              <Button
                key={exercise}
                variant={filterExercise === exercise ? "default" : "ghost"}
                size="sm"
                className="justify-start text-xs truncate"
                onClick={() => {
                  setFilterExercise(exercise);
                  setSearchOpen(false);
                }}
              >
                {exercise}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Day List */}
      <div className="space-y-3">
        {filteredDays.map((day) => (
          <Card key={day.date}>
            <button onClick={() => toggleDay(day.date)} className="w-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-center">
                  <span>
                    {getDayOfWeek(day.date)} ({day.date})
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">
                      {day.workout.exercises.length} exercises
                    </span>
                    {expandedDay === day.date ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </button>

            {expandedDay === day.date && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {day.workout.exercises.map((exercise, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-secondary/30">
                      <p className="font-medium text-sm mb-1">
                        {exercise.name}
                      </p>
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
            )}
          </Card>
        ))}
      </div>

      {filteredDays.length === 0 && filterExercise && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No workouts found for "{filterExercise}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
