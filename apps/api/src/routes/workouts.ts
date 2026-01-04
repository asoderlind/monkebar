import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { fetchWorkoutLogData } from "../lib/sheets.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import { getDayOfWeek, getWeekNumber, getYear } from "@monke-bar/shared";

export const workoutsRoutes = new Hono<{ Variables: AuthContext }>();

// All routes require authentication
workoutsRoutes.use("*", requireAuth);

const sheetParamsSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Sheet1"),
});

/**
 * GET /api/workouts
 * Get all workouts from Google Sheets
 */
workoutsRoutes.get("/", zValidator("query", sheetParamsSchema), async (c) => {
  try {
    const user = c.get("user");
    const { spreadsheetId, sheetName } = c.req.valid("query");
    const workouts = await fetchWorkoutLogData(
      user.id,
      spreadsheetId,
      sheetName
    );

    return c.json({
      success: true,
      data: workouts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/workouts/latest
 * Get the most recent workout
 */
workoutsRoutes.get(
  "/latest",
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
      const latestWorkout =
        workouts.length > 0 ? workouts[workouts.length - 1] : null;

      return c.json({
        success: true,
        data: latestWorkout,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/workouts/date/:date
 * Get workout for a specific date (YYYY-MM-DD)
 */
workoutsRoutes.get(
  "/date/:date",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const date = c.req.param("date");
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const workouts = await fetchWorkoutLogData(
        user.id,
        spreadsheetId,
        sheetName
      );
      const workout = workouts.find((w) => w.date === date);

      if (!workout) {
        return c.json({ success: false, error: "Workout not found" }, 404);
      }

      return c.json({
        success: true,
        data: workout,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/workouts/exercises
 * Get list of all unique exercises
 */
workoutsRoutes.get(
  "/exercises",
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

      workouts.forEach((workout) => {
        workout.exercises.forEach((exercise) => {
          exerciseSet.add(exercise.name);
        });
      });

      return c.json({
        success: true,
        data: Array.from(exerciseSet).sort(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/workouts/exercise/:name
 * Get all workout data for a specific exercise
 */
workoutsRoutes.get(
  "/exercise/:name",
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

      const exerciseHistory = workouts
        .map((workout) => {
          const exercise = workout.exercises.find(
            (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
          );
          if (!exercise) return null;

          return {
            date: workout.date,
            sets: exercise.sets,
          };
        })
        .filter((item) => item !== null);

      return c.json({
        success: true,
        data: {
          exerciseName,
          history: exerciseHistory,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);
