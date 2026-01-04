import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { fetchWorkoutLogData } from "../lib/sheets.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import type {
  BestSet,
  TrendDataPoint,
  ExerciseStats,
  VolumeHistory,
  DayOfWeek,
} from "@monke-bar/shared";

export const analyticsRoutes = new Hono<{ Variables: AuthContext }>();

// All routes require authentication
analyticsRoutes.use("*", requireAuth);

const sheetParamsSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Sheet1"),
});

/**
 * Calculate volume for a set (weight * reps)
 */
function calculateVolume(weight: number, reps: number): number {
  return weight * reps;
}

/**
 * GET /api/analytics/best-sets
 * Get best sets for all exercises in the last N weeks
 */
analyticsRoutes.get(
  "/best-sets",
  zValidator(
    "query",
    sheetParamsSchema.extend({
      weeks: z.string().optional().default("4"),
    })
  ),
  async (c) => {
    try {
      const user = c.get("user");
      const {
        spreadsheetId,
        sheetName,
        weeks: weeksStr,
      } = c.req.valid("query");
      const weeks = parseInt(weeksStr, 10);
      const workoutData = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      // Get the last N weeks
      const recentWeeks = workoutData.slice(-weeks);

      const bestSets: Record<string, BestSet> = {};

      recentWeeks.forEach((week) => {
        week.days.forEach((day) => {
          day.exercises.forEach((exercise) => {
            // Find best set (highest weight with at least 1 rep, excluding warmup)
            const workingSets = exercise.sets.filter((s) => !s.isWarmup);

            workingSets.forEach((set) => {
              const volume = calculateVolume(set.weight, set.reps);
              const current = bestSets[exercise.name];

              // Best by weight first, then by reps
              if (
                !current ||
                set.weight > current.weight ||
                (set.weight === current.weight && set.reps > current.reps)
              ) {
                bestSets[exercise.name] = {
                  exerciseName: exercise.name,
                  weight: set.weight,
                  reps: set.reps,
                  volume,
                  date: day.date || "",
                  weekNumber: week.weekNumber,
                };
              }
            });
          });
        });
      });

      return c.json({
        success: true,
        data: Object.values(bestSets),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/analytics/exercise/:name/trends
 * Get trend data for a specific exercise
 */
analyticsRoutes.get(
  "/exercise/:name/trends",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const exerciseName = decodeURIComponent(c.req.param("name"));
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const workoutData = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      const trends: TrendDataPoint[] = [];

      workoutData.forEach((week) => {
        week.days.forEach((day) => {
          const exercise = day.exercises.find(
            (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
          );

          if (exercise) {
            const workingSets = exercise.sets.filter((s) => !s.isWarmup);

            if (workingSets.length > 0) {
              const maxWeight = Math.max(...workingSets.map((s) => s.weight));
              const totalVolume = workingSets.reduce(
                (acc, s) => acc + calculateVolume(s.weight, s.reps),
                0
              );
              const totalReps = workingSets.reduce((acc, s) => acc + s.reps, 0);
              const averageWeight = totalVolume / totalReps;

              trends.push({
                date: day.date || `Week ${week.weekNumber} ${day.dayOfWeek}`,
                weekNumber: week.weekNumber,
                maxWeight,
                totalVolume,
                totalReps,
                averageWeight,
              });
            }
          }
        });
      });

      return c.json({
        success: true,
        data: {
          exerciseName,
          trends,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/analytics/exercise/:name/stats
 * Get comprehensive stats for a specific exercise
 */
analyticsRoutes.get(
  "/exercise/:name/stats",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const exerciseName = decodeURIComponent(c.req.param("name"));
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const workoutData = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      let currentPR: BestSet | null = null;
      let last4WeeksBest: BestSet | null = null;
      const trends: TrendDataPoint[] = [];
      let totalSessions = 0;

      // Get the last 4 weeks for "recent" best
      const recentWeeks = workoutData.slice(-4);

      workoutData.forEach((week) => {
        week.days.forEach((day) => {
          const exercise = day.exercises.find(
            (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
          );

          if (exercise) {
            totalSessions++;
            const workingSets = exercise.sets.filter((s) => !s.isWarmup);

            workingSets.forEach((set) => {
              const volume = calculateVolume(set.weight, set.reps);
              const setData: BestSet = {
                exerciseName: exercise.name,
                weight: set.weight,
                reps: set.reps,
                volume,
                date: day.date || `Week ${week.weekNumber} ${day.dayOfWeek}`,
                weekNumber: week.weekNumber,
              };

              // All-time PR
              if (
                !currentPR ||
                set.weight > currentPR.weight ||
                (set.weight === currentPR.weight && set.reps > currentPR.reps)
              ) {
                currentPR = setData;
              }
            });

            // Calculate trend data point
            if (workingSets.length > 0) {
              const maxWeight = Math.max(...workingSets.map((s) => s.weight));
              const totalVolume = workingSets.reduce(
                (acc, s) => acc + calculateVolume(s.weight, s.reps),
                0
              );
              const totalReps = workingSets.reduce((acc, s) => acc + s.reps, 0);

              trends.push({
                date: day.date || `Week ${week.weekNumber} ${day.dayOfWeek}`,
                weekNumber: week.weekNumber,
                maxWeight,
                totalVolume,
                totalReps,
                averageWeight: totalReps > 0 ? totalVolume / totalReps : 0,
              });
            }
          }
        });
      });

      // Find last 4 weeks best
      recentWeeks.forEach((week) => {
        week.days.forEach((day) => {
          const exercise = day.exercises.find(
            (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
          );

          if (exercise) {
            const workingSets = exercise.sets.filter((s) => !s.isWarmup);
            workingSets.forEach((set) => {
              if (
                !last4WeeksBest ||
                set.weight > last4WeeksBest.weight ||
                (set.weight === last4WeeksBest.weight &&
                  set.reps > last4WeeksBest.reps)
              ) {
                last4WeeksBest = {
                  exerciseName: exercise.name,
                  weight: set.weight,
                  reps: set.reps,
                  volume: calculateVolume(set.weight, set.reps),
                  date: day.date || `Week ${week.weekNumber} ${day.dayOfWeek}`,
                  weekNumber: week.weekNumber,
                };
              }
            });
          }
        });
      });

      const stats: ExerciseStats = {
        exerciseName,
        currentPR: currentPR || {
          exerciseName,
          weight: 0,
          reps: 0,
          volume: 0,
          date: "",
          weekNumber: 0,
        },
        last30DaysBest: last4WeeksBest,
        trend: trends,
        totalSessions,
      };

      return c.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/analytics/volume-history
 * Get volume history across all workouts
 */
analyticsRoutes.get(
  "/volume-history",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const workoutData = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      const volumeHistory: VolumeHistory[] = [];

      workoutData.forEach((week) => {
        week.days.forEach((day) => {
          let dayVolume = 0;
          let exerciseCount = 0;

          day.exercises.forEach((exercise) => {
            exerciseCount++;
            const workingSets = exercise.sets.filter((s) => !s.isWarmup);
            dayVolume += workingSets.reduce(
              (acc, s) => acc + calculateVolume(s.weight, s.reps),
              0
            );
          });

          if (exerciseCount > 0) {
            volumeHistory.push({
              date: day.date || `Week ${week.weekNumber} ${day.dayOfWeek}`,
              weekNumber: week.weekNumber,
              dayOfWeek: day.dayOfWeek,
              totalVolume: dayVolume,
              exerciseCount,
            });
          }
        });
      });

      return c.json({
        success: true,
        data: volumeHistory,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/analytics/summary
 * Get overall workout summary
 */
analyticsRoutes.get(
  "/summary",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const workoutData = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      const exerciseSet = new Set<string>();
      let totalSessions = 0;
      let totalSets = 0;
      let totalVolume = 0;

      workoutData.forEach((week) => {
        week.days.forEach((day) => {
          totalSessions++;
          day.exercises.forEach((exercise) => {
            exerciseSet.add(exercise.name);
            const workingSets = exercise.sets.filter((s) => !s.isWarmup);
            totalSets += workingSets.length;
            totalVolume += workingSets.reduce(
              (acc, s) => acc + calculateVolume(s.weight, s.reps),
              0
            );
          });
        });
      });

      return c.json({
        success: true,
        data: {
          totalWeeks: workoutData.length,
          totalSessions,
          totalSets,
          totalVolume,
          uniqueExercises: exerciseSet.size,
          exerciseList: Array.from(exerciseSet).sort(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);
