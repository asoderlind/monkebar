import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { fetchWorkoutLogData } from "../lib/sheets.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import { getDayOfWeek, getWeekNumber, getYear } from "@monke-bar/shared";
import { db } from "../db/index.js";
import {
  workoutSessions,
  exercises,
  sets,
  exerciseMaster,
} from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

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

// ============================================================================
// DATABASE ROUTES - For CSV Import/Export
// ============================================================================

/**
 * GET /api/workouts/db
 * Get all workouts from database (for CSV export)
 */
workoutsRoutes.get("/db", async (c) => {
  try {
    const user = c.get("user");

    // Query all workout sessions with their exercises and sets
    const sessions = await db
      .select()
      .from(workoutSessions)
      .orderBy(desc(workoutSessions.date));

    // Fetch exercises and sets for each session
    const workouts = await Promise.all(
      sessions.map(async (session) => {
        const sessionExercises = await db
          .select()
          .from(exercises)
          .where(eq(exercises.sessionId, session.id))
          .orderBy(exercises.orderIndex);

        const exercisesWithSets = await Promise.all(
          sessionExercises.map(async (ex) => {
            const exerciseSets = await db
              .select()
              .from(sets)
              .where(eq(sets.exerciseId, ex.id))
              .orderBy(sets.setNumber);

            return {
              id: ex.id,
              name: ex.name,
              groupId: ex.groupId || undefined,
              groupType: ex.groupType || undefined,
              sets: exerciseSets.map((s) => ({
                setNumber: s.setNumber,
                weight: parseFloat(s.weight),
                reps: s.reps,
                isWarmup: s.isWarmup,
              })),
            };
          })
        );

        return {
          date: session.date || "",
          dayOfWeek: session.dayOfWeek,
          weekNumber: session.weekNumber,
          exercises: exercisesWithSets,
        };
      })
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

const workoutSetSchema = z.object({
  setNumber: z.number(),
  weight: z.number(),
  reps: z.number(),
  isWarmup: z.boolean(),
});

const exerciseSchema = z.object({
  name: z.string(),
  groupId: z.string().optional(),
  groupType: z.string().optional(),
  sets: z.array(workoutSetSchema),
});

const workoutSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  dayOfWeek: z.string(),
  exercises: z.array(exerciseSchema),
});

/**
 * POST /api/workouts/db
 * Create or update workout in database (for CSV import)
 * This will overwrite existing workouts for the same date
 */
workoutsRoutes.post(
  "/db",
  zValidator("json", z.object({ workouts: z.array(workoutSchema) })),
  async (c) => {
    try {
      const user = c.get("user");
      const { workouts } = c.req.valid("json");

      let importedCount = 0;
      let updatedCount = 0;

      // Process each workout
      for (const workout of workouts) {
        const workoutDate = new Date(workout.date);
        const weekNumber = getWeekNumber(workoutDate);
        const year = getYear(workoutDate);

        // Check if workout session already exists for this date
        const existingSession = await db.query.workoutSessions.findFirst({
          where: eq(workoutSessions.date, workout.date),
        });

        let sessionId: number;

        if (existingSession) {
          // Delete old exercises and sets (cascade will handle sets)
          await db
            .delete(exercises)
            .where(eq(exercises.sessionId, existingSession.id));

          // Update the session
          await db
            .update(workoutSessions)
            .set({
              weekNumber,
              dayOfWeek: workout.dayOfWeek,
              updatedAt: new Date(),
            })
            .where(eq(workoutSessions.id, existingSession.id));

          sessionId = existingSession.id;
          updatedCount++;
        } else {
          // Create new session
          const [newSession] = await db
            .insert(workoutSessions)
            .values({
              weekNumber,
              dayOfWeek: workout.dayOfWeek,
              date: workout.date,
            })
            .returning();

          sessionId = newSession.id;
          importedCount++;
        }

        // Insert exercises and sets
        for (let i = 0; i < workout.exercises.length; i++) {
          const exercise = workout.exercises[i];

          const [newExercise] = await db
            .insert(exercises)
            .values({
              sessionId,
              name: exercise.name,
              orderIndex: i,
              groupId: exercise.groupId || null,
              groupType: exercise.groupType || null,
            })
            .returning();

          // Insert sets
          if (exercise.sets.length > 0) {
            await db.insert(sets).values(
              exercise.sets.map((set) => ({
                exerciseId: newExercise.id,
                setNumber: set.setNumber,
                weight: set.weight.toString(),
                reps: set.reps,
                isWarmup: set.isWarmup,
              }))
            );
          }
        }
      }

      return c.json({
        success: true,
        data: {
          imported: importedCount,
          updated: updatedCount,
          total: workouts.length,
        },
      });
    } catch (error) {
      console.error("Error importing workouts:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * DELETE /api/workouts/db
 * Delete all workouts from database
 */
workoutsRoutes.delete("/db", async (c) => {
  try {
    const user = c.get("user");

    // Delete all workout sessions (cascade will handle exercises and sets)
    await db.delete(workoutSessions);

    return c.json({
      success: true,
      message: "All workouts deleted",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});
