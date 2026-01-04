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
} from "@monke-bar/shared";
import { getDayOfWeek, getWeekNumber, getYear } from "@monke-bar/shared";

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
 * Get best sets for all exercises in the last N days
 */
analyticsRoutes.get(
  "/best-sets",
  zValidator(
    "query",
    sheetParamsSchema.extend({
      days: z.string().optional().default("30"),
    })
  ),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName, days: daysStr } = c.req.valid("query");
      const days = parseInt(daysStr, 10);
      const workouts = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      // Get workouts from the last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      const recentWorkouts = workouts.filter((w) => w.date >= cutoffStr);

      const bestSets: Record<string, BestSet> = {};

      recentWorkouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
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
                date: workout.date,
              };
            }
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
      const workouts = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      const trends: TrendDataPoint[] = [];

      workouts.forEach((workout) => {
        const exercise = workout.exercises.find(
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
              date: workout.date,
              maxWeight,
              totalVolume,
              totalReps,
              averageWeight,
            });
          }
        }
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
      const workouts = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      let currentPR: BestSet | null = null;
      let last30DaysBest: BestSet | null = null;
      const trends: TrendDataPoint[] = [];
      let totalSessions = 0;

      // Get the last 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];
      const recentWorkouts = workouts.filter((w) => w.date >= cutoffStr);

      workouts.forEach((workout) => {
        const exercise = workout.exercises.find(
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
              date: workout.date,
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
              date: workout.date,
              maxWeight,
              totalVolume,
              totalReps,
              averageWeight: totalReps > 0 ? totalVolume / totalReps : 0,
            });
          }
        }
      });

      // Find last 30 days best
      recentWorkouts.forEach((workout) => {
        const exercise = workout.exercises.find(
          (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
        );

        if (exercise) {
          const workingSets = exercise.sets.filter((s) => !s.isWarmup);
          workingSets.forEach((set) => {
            if (
              !last30DaysBest ||
              set.weight > last30DaysBest.weight ||
              (set.weight === last30DaysBest.weight &&
                set.reps > last30DaysBest.reps)
            ) {
              last30DaysBest = {
                exerciseName: exercise.name,
                weight: set.weight,
                reps: set.reps,
                volume: calculateVolume(set.weight, set.reps),
                date: workout.date,
              };
            }
          });
        }
      });

      const stats: ExerciseStats = {
        exerciseName,
        currentPR: currentPR || {
          exerciseName,
          weight: 0,
          reps: 0,
          volume: 0,
          date: "",
        },
        last30DaysBest,
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
      const workouts = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      const volumeHistory: VolumeHistory[] = workouts.map((workout) => {
        let totalVolume = 0;

        workout.exercises.forEach((exercise) => {
          const workingSets = exercise.sets.filter((s) => !s.isWarmup);
          totalVolume += workingSets.reduce(
            (acc, s) => acc + calculateVolume(s.weight, s.reps),
            0
          );
        });

        return {
          date: workout.date,
          totalVolume,
          exerciseCount: workout.exercises.length,
        };
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
      const workouts = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );

      const exerciseSet = new Set<string>();
      let totalSets = 0;
      let totalVolume = 0;

      workouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
          exerciseSet.add(exercise.name);
          const workingSets = exercise.sets.filter((s) => !s.isWarmup);
          totalSets += workingSets.length;
          totalVolume += workingSets.reduce(
            (acc, s) => acc + calculateVolume(s.weight, s.reps),
            0
          );
        });
      });

      return c.json({
        success: true,
        data: {
          totalWorkouts: workouts.length,
          totalSessions: workouts.length,
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
