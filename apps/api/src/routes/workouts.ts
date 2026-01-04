import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { fetchWorkoutData } from "../lib/sheets.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import type { DayOfWeek } from "@monke-bar/shared";

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
    const weeks = await fetchWorkoutData(user.id, spreadsheetId, sheetName);

    return c.json({
      success: true,
      data: weeks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/workouts/week/:weekNumber
 * Get a specific week's workouts
 */
workoutsRoutes.get(
  "/week/:weekNumber",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const weekNumber = parseInt(c.req.param("weekNumber"), 10);
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const weeks = await fetchWorkoutData(user.id, spreadsheetId, sheetName);
      const week = weeks.find((w) => w.weekNumber === weekNumber);

      if (!week) {
        return c.json({ success: false, error: "Week not found" }, 404);
      }

      return c.json({
        success: true,
        data: week,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/workouts/latest
 * Get the most recent week's workouts
 */
workoutsRoutes.get(
  "/latest",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const weeks = await fetchWorkoutData(user.id, spreadsheetId, sheetName);
      const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;

      return c.json({
        success: true,
        data: latestWeek,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/workouts/day/:dayOfWeek
 * Get workouts for a specific day across all weeks
 */
workoutsRoutes.get(
  "/day/:dayOfWeek",
  zValidator("query", sheetParamsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const dayOfWeek = c.req.param("dayOfWeek") as DayOfWeek;
      const { spreadsheetId, sheetName } = c.req.valid("query");
      const weeks = await fetchWorkoutData(user.id, spreadsheetId, sheetName);

      const dayWorkouts = weeks
        .map((week) => ({
          weekNumber: week.weekNumber,
          day: week.days.find((d) => d.dayOfWeek === dayOfWeek),
        }))
        .filter((w) => w.day !== undefined);

      return c.json({
        success: true,
        data: dayWorkouts,
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
      const weeks = await fetchWorkoutData(user.id, spreadsheetId, sheetName);
      const exerciseSet = new Set<string>();

      weeks.forEach((week) => {
        week.days.forEach((day) => {
          day.exercises.forEach((exercise) => {
            exerciseSet.add(exercise.name);
          });
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
      const weeks = await fetchWorkoutData(user.id, spreadsheetId, sheetName);

      const exerciseHistory: Array<{
        weekNumber: number;
        dayOfWeek: DayOfWeek;
        sets: Array<{
          weight: number;
          reps: number;
          isWarmup: boolean;
          setNumber: number;
        }>;
      }> = [];

      weeks.forEach((week) => {
        week.days.forEach((day) => {
          const exercise = day.exercises.find(
            (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
          );
          if (exercise) {
            exerciseHistory.push({
              weekNumber: week.weekNumber,
              dayOfWeek: day.dayOfWeek,
              sets: exercise.sets,
            });
          }
        });
      });

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
