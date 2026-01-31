import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/index.js";
import { measurements } from "../db/schema.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import { eq, and, desc } from "drizzle-orm";

export const measurementsRoutes = new Hono<{ Variables: AuthContext }>();

// All routes require authentication
measurementsRoutes.use("*", requireAuth);

// Validation schemas
const createMeasurementSchema = z.object({
  type: z.string().min(1).max(50),
  value: z.number().positive(),
  unit: z.string().min(1).max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  notes: z.string().optional(),
});

const updateMeasurementSchema = z.object({
  value: z.number().positive().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/measurements
 * Get all measurements for the user, optionally filtered by type
 */
measurementsRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const type = c.req.query("type");

    const conditions = [eq(measurements.userId, user.id)];
    if (type) {
      conditions.push(eq(measurements.type, type));
    }

    const result = await db
      .select()
      .from(measurements)
      .where(and(...conditions))
      .orderBy(desc(measurements.date));

    return c.json({
      success: true,
      data: result.map((m) => ({
        ...m,
        value: parseFloat(m.value),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/measurements/:id
 * Get a specific measurement by ID
 */
measurementsRoutes.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid measurement ID" }, 400);
    }

    const [measurement] = await db
      .select()
      .from(measurements)
      .where(and(eq(measurements.id, id), eq(measurements.userId, user.id)));

    if (!measurement) {
      return c.json({ success: false, error: "Measurement not found" }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...measurement,
        value: parseFloat(measurement.value),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/measurements
 * Create a new measurement
 */
measurementsRoutes.post(
  "/",
  zValidator("json", createMeasurementSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error.issues.map((i) => i.message).join(", "),
        },
        400
      );
    }
  }),
  async (c) => {
    try {
      const user = c.get("user");
      const body = c.req.valid("json");

      // Check if measurement already exists for this date and type
      const [existing] = await db
        .select()
        .from(measurements)
        .where(
          and(
            eq(measurements.userId, user.id),
            eq(measurements.type, body.type),
            eq(measurements.date, body.date)
          )
        );

      if (existing) {
        // Update existing measurement instead of creating a new one
        const [updated] = await db
          .update(measurements)
          .set({
            value: body.value.toString(),
            notes: body.notes,
            updatedAt: new Date(),
          })
          .where(eq(measurements.id, existing.id))
          .returning();

        return c.json({
          success: true,
          data: {
            ...updated,
            value: parseFloat(updated.value),
          },
        });
      }

      const [newMeasurement] = await db
        .insert(measurements)
        .values({
          userId: user.id,
          type: body.type,
          value: body.value.toString(),
          unit: body.unit,
          date: body.date,
          notes: body.notes,
        })
        .returning();

      return c.json({
        success: true,
        data: {
          ...newMeasurement,
          value: parseFloat(newMeasurement.value),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * PUT /api/measurements/:id
 * Update a measurement
 */
measurementsRoutes.put(
  "/:id",
  zValidator("json", updateMeasurementSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error.issues.map((i) => i.message).join(", "),
        },
        400
      );
    }
  }),
  async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) {
        return c.json({ success: false, error: "Invalid measurement ID" }, 400);
      }

      const body = c.req.valid("json");

      // Check if measurement exists and belongs to this user
      const [existing] = await db
        .select()
        .from(measurements)
        .where(and(eq(measurements.id, id), eq(measurements.userId, user.id)));

      if (!existing) {
        return c.json({ success: false, error: "Measurement not found" }, 404);
      }

      const [updated] = await db
        .update(measurements)
        .set({
          ...(body.value !== undefined && { value: body.value.toString() }),
          ...(body.notes !== undefined && { notes: body.notes }),
          updatedAt: new Date(),
        })
        .where(eq(measurements.id, id))
        .returning();

      return c.json({
        success: true,
        data: {
          ...updated,
          value: parseFloat(updated.value),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * DELETE /api/measurements/:id
 * Delete a measurement
 */
measurementsRoutes.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid measurement ID" }, 400);
    }

    // Check if measurement exists and belongs to this user
    const [existing] = await db
      .select()
      .from(measurements)
      .where(and(eq(measurements.id, id), eq(measurements.userId, user.id)));

    if (!existing) {
      return c.json({ success: false, error: "Measurement not found" }, 404);
    }

    await db.delete(measurements).where(eq(measurements.id, id));

    return c.json({
      success: true,
      data: { message: "Measurement deleted successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});
