import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import type {
  BestSet,
  TrendDataPoint,
  ExerciseStats,
  VolumeHistory,
} from "@monke-bar/shared";
import { db } from "../db/index.js";
import { workoutSessions, exercises, sets } from "../db/schema.js";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";

export const analyticsRoutes = new Hono<{ Variables: AuthContext }>();

// All routes require authentication
analyticsRoutes.use("*", requireAuth);

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
    z.object({
      days: z.string().optional().default("30"),
    })
  ),
  async (c) => {
    try {
      const user = c.get("user");
      const { days: daysStr } = c.req.valid("query");
      const days = parseInt(daysStr, 10);

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      // Query workout sessions from the last N days with exercises and sets
      const recentSessions = await db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, user.id),
            gte(workoutSessions.date, cutoffStr)
          )
        )
        .orderBy(desc(workoutSessions.date));

      const bestSets: Record<string, BestSet> = {};

      // Fetch exercises and sets for each session
      for (const session of recentSessions) {
        const sessionExercises = await db
          .select()
          .from(exercises)
          .where(eq(exercises.sessionId, session.id));

        for (const exercise of sessionExercises) {
          const exerciseSets = await db
            .select()
            .from(sets)
            .where(
              and(eq(sets.exerciseId, exercise.id), eq(sets.isWarmup, false))
            )
            .orderBy(sets.setNumber);

          for (const set of exerciseSets) {
            const weight = parseFloat(set.weight);
            const volume = calculateVolume(weight, set.reps);
            const current = bestSets[exercise.name];

            // Best by weight first, then by reps
            if (
              !current ||
              weight > current.weight ||
              (weight === current.weight && set.reps > current.reps)
            ) {
              bestSets[exercise.name] = {
                exerciseName: exercise.name,
                weight,
                reps: set.reps,
                volume,
                date: session.date || "",
              };
            }
          }
        }
      }

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
analyticsRoutes.get("/exercise/:name/trends", async (c) => {
  try {
    const user = c.get("user");
    const exerciseName = decodeURIComponent(c.req.param("name"));

    // Get all sessions that have this exercise
    const allSessions = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id))
      .orderBy(workoutSessions.date);

    const trends: TrendDataPoint[] = [];

    for (const session of allSessions) {
      const sessionExercises = await db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.sessionId, session.id),
            sql`LOWER(${exercises.name}) = LOWER(${exerciseName})`
          )
        );

      if (sessionExercises.length > 0) {
        const exercise = sessionExercises[0];

        const workingSets = await db
          .select()
          .from(sets)
          .where(
            and(eq(sets.exerciseId, exercise.id), eq(sets.isWarmup, false))
          );

        if (workingSets.length > 0) {
          const weights = workingSets.map((s) => parseFloat(s.weight));
          const maxWeight = Math.max(...weights);
          let totalVolume = 0;
          let totalReps = 0;

          workingSets.forEach((s) => {
            const weight = parseFloat(s.weight);
            totalVolume += calculateVolume(weight, s.reps);
            totalReps += s.reps;
          });

          const averageWeight = totalReps > 0 ? totalVolume / totalReps : 0;

          trends.push({
            date: session.date || "",
            maxWeight,
            totalVolume,
            totalReps,
            averageWeight,
          });
        }
      }
    }

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
});

/**
 * GET /api/analytics/exercise/:name/stats
 * Get comprehensive stats for a specific exercise
 */
analyticsRoutes.get("/exercise/:name/stats", async (c) => {
  try {
    const user = c.get("user");
    const exerciseName = decodeURIComponent(c.req.param("name"));

    let currentPR: BestSet | null = null;
    let last30DaysBest: BestSet | null = null;
    const trends: TrendDataPoint[] = [];
    let totalSessions = 0;

    // Get the last 30 days cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    // Get all sessions
    const allSessions = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id))
      .orderBy(workoutSessions.date);

    const recentSessions = allSessions.filter(
      (s) => (s.date || "") >= cutoffStr
    );

    for (const session of allSessions) {
      const sessionExercises = await db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.sessionId, session.id),
            sql`LOWER(${exercises.name}) = LOWER(${exerciseName})`
          )
        );

      if (sessionExercises.length > 0) {
        totalSessions++;
        const exercise = sessionExercises[0];

        const workingSets = await db
          .select()
          .from(sets)
          .where(
            and(eq(sets.exerciseId, exercise.id), eq(sets.isWarmup, false))
          );

        // Calculate all-time PR
        for (const set of workingSets) {
          const weight = parseFloat(set.weight);
          const volume = calculateVolume(weight, set.reps);
          const setData: BestSet = {
            exerciseName: exercise.name,
            weight,
            reps: set.reps,
            volume,
            date: session.date || "",
          };

          if (
            !currentPR ||
            weight > currentPR.weight ||
            (weight === currentPR.weight && set.reps > currentPR.reps)
          ) {
            currentPR = setData;
          }
        }

        // Calculate trend data point
        if (workingSets.length > 0) {
          const weights = workingSets.map((s) => parseFloat(s.weight));
          const maxWeight = Math.max(...weights);
          let totalVolume = 0;
          let totalReps = 0;

          workingSets.forEach((s) => {
            const weight = parseFloat(s.weight);
            totalVolume += calculateVolume(weight, s.reps);
            totalReps += s.reps;
          });

          trends.push({
            date: session.date || "",
            maxWeight,
            totalVolume,
            totalReps,
            averageWeight: totalReps > 0 ? totalVolume / totalReps : 0,
          });
        }
      }
    }

    // Find last 30 days best
    for (const session of recentSessions) {
      const sessionExercises = await db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.sessionId, session.id),
            sql`LOWER(${exercises.name}) = LOWER(${exerciseName})`
          )
        );

      if (sessionExercises.length > 0) {
        const exercise = sessionExercises[0];
        const workingSets = await db
          .select()
          .from(sets)
          .where(
            and(eq(sets.exerciseId, exercise.id), eq(sets.isWarmup, false))
          );

        for (const set of workingSets) {
          const weight = parseFloat(set.weight);
          if (
            !last30DaysBest ||
            weight > last30DaysBest.weight ||
            (weight === last30DaysBest.weight && set.reps > last30DaysBest.reps)
          ) {
            last30DaysBest = {
              exerciseName: exercise.name,
              weight,
              reps: set.reps,
              volume: calculateVolume(weight, set.reps),
              date: session.date || "",
            };
          }
        }
      }
    }

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
});

/**
 * GET /api/analytics/volume-history
 * Get volume history aggregated by week
 */
analyticsRoutes.get("/volume-history", async (c) => {
  try {
    const user = c.get("user");
    const allSessions = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id))
      .orderBy(workoutSessions.date);

    // Group by ISO week (YYYY-Www format)
    const weeklyData: Record<string, { totalVolume: number; exerciseCount: number }> = {};

    for (const session of allSessions) {
      if (!session.date) continue;

      // Calculate ISO week (YYYY-Www format)
      const date = new Date(session.date);
      const year = date.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      const weekKey = `${year}-W${weekNumber}`;

      const sessionExercises = await db
        .select()
        .from(exercises)
        .where(eq(exercises.sessionId, session.id));

      let totalVolume = 0;

      for (const exercise of sessionExercises) {
        const workingSets = await db
          .select()
          .from(sets)
          .where(
            and(eq(sets.exerciseId, exercise.id), eq(sets.isWarmup, false))
          );

        totalVolume += workingSets.reduce((acc, s) => {
          const weight = parseFloat(s.weight);
          return acc + calculateVolume(weight, s.reps);
        }, 0);
      }

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { totalVolume: 0, exerciseCount: 0 };
      }
      weeklyData[weekKey].totalVolume += totalVolume;
      weeklyData[weekKey].exerciseCount += sessionExercises.length;
    }

    // Convert to array format
    const volumeHistory = Object.entries(weeklyData).map(([week, data]) => ({
      week,
      totalVolume: data.totalVolume,
      exerciseCount: data.exerciseCount,
    }));

    return c.json({
      success: true,
      data: volumeHistory,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/analytics/summary
 * Get overall workout summary
 */
analyticsRoutes.get("/summary", async (c) => {
  try {
    const user = c.get("user");
    const allSessions = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id));

    // Get all exercises for this user's sessions
    const sessionIds = allSessions.map((s) => s.id);
    const allExercises =
      sessionIds.length > 0
        ? await db
            .select()
            .from(exercises)
            .where(inArray(exercises.sessionId, sessionIds))
        : [];

    const exerciseSet = new Set<string>();
    let totalSets = 0;
    let totalVolume = 0;

    for (const exercise of allExercises) {
      exerciseSet.add(exercise.name);

      const workingSets = await db
        .select()
        .from(sets)
        .where(and(eq(sets.exerciseId, exercise.id), eq(sets.isWarmup, false)));

      totalSets += workingSets.length;
      totalVolume += workingSets.reduce((acc, s) => {
        const weight = parseFloat(s.weight);
        return acc + calculateVolume(weight, s.reps);
      }, 0);
    }

    return c.json({
      success: true,
      data: {
        totalWorkouts: allSessions.length,
        totalSessions: allSessions.length,
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
});

