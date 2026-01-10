import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
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

// ============================================================================
// DATABASE ROUTES
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
      .where(eq(workoutSessions.userId, user.id))
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
          where: and(
            eq(workoutSessions.userId, user.id),
            eq(workoutSessions.date, workout.date)
          ),
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
              userId: user.id,
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

    // Delete all workout sessions for this user (cascade will handle exercises and sets)
    await db
      .delete(workoutSessions)
      .where(eq(workoutSessions.userId, user.id));

    return c.json({
      success: true,
      message: "All workouts deleted",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/workouts/db/entries
 * Add workout entries to database (similar to sheets workout log)
 */
const workoutEntrySchema = z.object({
  date: z.string(),
  day: z.string(),
  exercise: z.string(),
  warmup: z
    .object({
      weight: z.number(),
      reps: z.number(),
    })
    .optional(),
  sets: z.array(
    z.object({
      weight: z.number(),
      reps: z.number(),
    })
  ),
  groupId: z.string().optional(),
  groupType: z.enum(["superset"]).optional(),
});

workoutsRoutes.post(
  "/db/entries",
  zValidator("json", z.object({ entries: z.array(workoutEntrySchema) })),
  async (c) => {
    try {
      const user = c.get("user");
      const { entries } = c.req.valid("json");

      let entriesAdded = 0;

      // Group entries by date
      const entriesByDate = entries.reduce((acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
      }, {} as Record<string, typeof entries>);

      // Process each date
      for (const [date, dateEntries] of Object.entries(entriesByDate)) {
        const workoutDate = new Date(date);
        const dayOfWeek = getDayOfWeek(workoutDate);
        const weekNumber = getWeekNumber(workoutDate);
        const year = getYear(workoutDate);

        // Find or create workout session
        let session = await db.query.workoutSessions.findFirst({
          where: and(eq(workoutSessions.userId, user.id), eq(workoutSessions.date, date)),
        });

        if (!session) {
          const [newSession] = await db
            .insert(workoutSessions)
            .values({
              userId: user.id,
              weekNumber,
              dayOfWeek,
              date,
            })
            .returning();
          session = newSession;
        }

        // Get existing exercise count to maintain order
        const existingExercises = await db
          .select()
          .from(exercises)
          .where(eq(exercises.sessionId, session.id));

        let orderIndex = existingExercises.length;

        // Add each entry as an exercise
        for (const entry of dateEntries) {
          const [newExercise] = await db
            .insert(exercises)
            .values({
              sessionId: session.id,
              name: entry.exercise,
              orderIndex: orderIndex++,
              groupId: entry.groupId || null,
              groupType: entry.groupType || null,
            })
            .returning();

          // Add sets
          const setsToInsert = [];

          // Add warmup set if exists
          if (entry.warmup) {
            setsToInsert.push({
              exerciseId: newExercise.id,
              setNumber: 0,
              weight: entry.warmup.weight.toString(),
              reps: entry.warmup.reps,
              isWarmup: true,
            });
          }

          // Add working sets
          entry.sets.forEach((set, idx) => {
            setsToInsert.push({
              exerciseId: newExercise.id,
              setNumber: idx + 1,
              weight: set.weight.toString(),
              reps: set.reps,
              isWarmup: false,
            });
          });

          if (setsToInsert.length > 0) {
            await db.insert(sets).values(setsToInsert);
          }

          entriesAdded++;
        }
      }

      return c.json({
        success: true,
        data: { entriesAdded },
      });
    } catch (error) {
      console.error("Error adding workout entries:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * DELETE /api/workouts/db/:date/exercise/:exerciseId
 * Delete a specific exercise from a workout
 */
workoutsRoutes.delete("/db/:date/exercise/:exerciseId", async (c) => {
  try {
    const user = c.get("user");
    const date = c.req.param("date");
    const exerciseId = c.req.param("exerciseId");

    // Verify the exercise belongs to this user by checking the workout session
    const exercise = await db.query.exercises.findFirst({
      where: eq(exercises.id, parseInt(exerciseId)),
      with: {
        session: true,
      },
    });

    if (!exercise) {
      return c.json({ success: false, error: "Exercise not found" }, 404);
    }

    if (exercise.session.userId !== user.id) {
      return c.json(
        { success: false, error: "Unauthorized to delete this exercise" },
        403
      );
    }

    // Delete the exercise (cascade will handle sets)
    await db.delete(exercises).where(eq(exercises.id, parseInt(exerciseId)));

    return c.json({
      success: true,
      message: "Exercise deleted",
    });
  } catch (error) {
    console.error("Error deleting exercise:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});
