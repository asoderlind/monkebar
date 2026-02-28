import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/index.js";
import { exerciseMaster } from "../db/schema.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import { eq, isNull, or, sql, and } from "drizzle-orm";
import { MUSCLE_GROUPS, EXERCISE_CATEGORIES } from "@monke-bar/shared";

export const exercisesRoutes = new Hono<{ Variables: AuthContext }>();

// All routes require authentication
exercisesRoutes.use("*", requireAuth);

// Validation schemas
const createExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  category: z
    .enum(EXERCISE_CATEGORIES as [string, ...string[]])
    .default("Strength"),
  muscleGroup: z.enum(MUSCLE_GROUPS as [string, ...string[]]),
  notes: z.string().optional(),
});

const updateExerciseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(EXERCISE_CATEGORIES as [string, ...string[]]).optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS as [string, ...string[]]).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/exercises
 * Get all non-deleted exercises
 */
exercisesRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const exercises = await db
      .select()
      .from(exerciseMaster)
      .where(
        and(eq(exerciseMaster.userId, user.id), isNull(exerciseMaster.deletedAt))
      )
      .orderBy(exerciseMaster.name);

    return c.json({
      success: true,
      data: exercises,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/exercises/:id
 * Get a specific exercise by ID
 */
exercisesRoutes.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid exercise ID" }, 400);
    }

    const [exercise] = await db
      .select()
      .from(exerciseMaster)
      .where(
        and(
          eq(exerciseMaster.id, id),
          eq(exerciseMaster.userId, user.id),
          isNull(exerciseMaster.deletedAt)
        )
      );

    if (!exercise) {
      return c.json({ success: false, error: "Exercise not found" }, 404);
    }

    return c.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/exercises
 * Create a new exercise (case-insensitive name uniqueness check)
 */
exercisesRoutes.post(
  "/",
  zValidator("json", createExerciseSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const body = c.req.valid("json");

      // Check for case-insensitive duplicate names for this user (excluding soft-deleted)
      const existingExercises = await db
        .select()
        .from(exerciseMaster)
        .where(
          sql`${exerciseMaster.userId} = ${user.id} AND LOWER(${exerciseMaster.name}) = LOWER(${body.name}) AND ${exerciseMaster.deletedAt} IS NULL`
        );

      if (existingExercises.length > 0) {
        return c.json(
          {
            success: false,
            error: "An exercise with this name already exists",
          },
          400
        );
      }

      const [newExercise] = await db
        .insert(exerciseMaster)
        .values({
          userId: user.id,
          name: body.name,
          category: body.category,
          muscleGroup: body.muscleGroup,
          notes: body.notes,
        })
        .returning();

      return c.json({
        success: true,
        data: newExercise,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * PUT /api/exercises/:id
 * Update an exercise (case-insensitive name uniqueness check)
 */
exercisesRoutes.put(
  "/:id",
  zValidator("json", updateExerciseSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) {
        return c.json({ success: false, error: "Invalid exercise ID" }, 400);
      }

      const body = c.req.valid("json");

      // Check if exercise exists, is not deleted, and belongs to this user
      const [existingExercise] = await db
        .select()
        .from(exerciseMaster)
        .where(
          and(
            eq(exerciseMaster.id, id),
            eq(exerciseMaster.userId, user.id),
            isNull(exerciseMaster.deletedAt)
          )
        );

      if (!existingExercise) {
        return c.json({ success: false, error: "Exercise not found" }, 404);
      }

      // If name is being updated, check for case-insensitive duplicates for this user
      if (body.name) {
        const duplicates = await db
          .select()
          .from(exerciseMaster)
          .where(
            sql`${exerciseMaster.id} != ${id} AND ${exerciseMaster.userId} = ${user.id} AND LOWER(${exerciseMaster.name}) = LOWER(${body.name}) AND ${exerciseMaster.deletedAt} IS NULL`
          );

        if (duplicates.length > 0) {
          return c.json(
            {
              success: false,
              error: "An exercise with this name already exists",
            },
            400
          );
        }
      }

      const [updatedExercise] = await db
        .update(exerciseMaster)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.muscleGroup !== undefined && {
            muscleGroup: body.muscleGroup,
          }),
          ...(body.notes !== undefined && { notes: body.notes }),
        })
        .where(eq(exerciseMaster.id, id))
        .returning();

      return c.json({
        success: true,
        data: updatedExercise,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * DELETE /api/exercises/:id
 * Soft delete an exercise
 */
exercisesRoutes.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid exercise ID" }, 400);
    }

    // Check if exercise exists, is not already deleted, and belongs to this user
    const [existingExercise] = await db
      .select()
      .from(exerciseMaster)
      .where(
        and(
          eq(exerciseMaster.id, id),
          eq(exerciseMaster.userId, user.id),
          isNull(exerciseMaster.deletedAt)
        )
      );

    if (!existingExercise) {
      return c.json({ success: false, error: "Exercise not found" }, 404);
    }

    // Soft delete by setting deletedAt timestamp
    await db
      .update(exerciseMaster)
      .set({ deletedAt: new Date() })
      .where(eq(exerciseMaster.id, id));

    return c.json({
      success: true,
      data: { message: "Exercise deleted successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});
