import { useState } from "react";
import { useWorkouts, useExerciseList } from "@/hooks/useWorkouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface HistoryViewProps {
  spreadsheetId: string;
  sheetName: string;
}

export function HistoryView({ spreadsheetId, sheetName }: HistoryViewProps) {
  const { data: weeks, isLoading } = useWorkouts(spreadsheetId, sheetName);
  const { data: exercises } = useExerciseList(spreadsheetId, sheetName);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [filterExercise, setFilterExercise] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading history...
        </div>
      </div>
    );
  }

  if (!weeks || weeks.length === 0) {
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

  // Reverse to show most recent first
  const sortedWeeks = [...weeks].reverse();

  // Filter by exercise if selected
  const filteredWeeks = filterExercise
    ? sortedWeeks.map((week) => ({
        ...week,
        days: week.days
          .map((day) => ({
            ...day,
            exercises: day.exercises.filter((e) =>
              e.name.toLowerCase().includes(filterExercise.toLowerCase())
            ),
          }))
          .filter((day) => day.exercises.length > 0),
      }))
    : sortedWeeks;

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber);
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

      {/* Week List */}
      <div className="space-y-3">
        {filteredWeeks.map((week) => (
          <Card key={week.weekNumber}>
            <button
              onClick={() => toggleWeek(week.weekNumber)}
              className="w-full"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Week {week.weekNumber}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {week.days.length} days
                    </span>
                    {expandedWeek === week.weekNumber ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </button>

            {expandedWeek === week.weekNumber && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {week.days.map((day) => (
                    <div key={day.dayOfWeek} className="space-y-2">
                      <h4 className="text-sm font-semibold text-primary">
                        {day.dayOfWeek}
                      </h4>
                      <div className="space-y-2">
                        {day.exercises.map((exercise, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-secondary/30"
                          >
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
                                  {set.weight}×{set.reps}
                                </span>
                              ))}
                            </div>
                          </div>
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

      {filteredWeeks.every((w) => w.days.length === 0) && filterExercise && (
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
