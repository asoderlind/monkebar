import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  fetchWorkoutLogData,
  getSpreadsheetInfo,
  updateCell,
  formatSetValue,
  listUserSpreadsheets,
  sheetExists,
  createWorkoutLogSheet,
  appendWorkoutEntries,
  type WorkoutLogEntry,
} from "../lib/sheets.js";
import { requireAuth, type AuthContext } from "../lib/middleware.js";
import { db } from "../db/index.js";
import { syncLogs } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const sheetsRoutes = new Hono<{ Variables: AuthContext }>();

// All routes require authentication
sheetsRoutes.use("*", requireAuth);

/**
 * GET /api/sheets/spreadsheets
 * List user's Google Spreadsheets
 */
sheetsRoutes.get("/spreadsheets", async (c) => {
  try {
    const user = c.get("user");
    const spreadsheets = await listUserSpreadsheets(user.id);
    return c.json({ success: true, data: spreadsheets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/sheets/info
 * Get spreadsheet metadata
 */
const infoSchema = z.object({
  spreadsheetId: z.string().min(1),
});

sheetsRoutes.get("/info", zValidator("query", infoSchema), async (c) => {
  try {
    const user = c.get("user");
    const { spreadsheetId } = c.req.valid("query");
    const info = await getSpreadsheetInfo(user.id, spreadsheetId);
    return c.json({ success: true, data: info });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/sheets/sync
 * Sync data from Google Sheets
 */
const syncSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Sheet1"),
});

sheetsRoutes.get("/sync", zValidator("query", syncSchema), async (c) => {
  try {
    const user = c.get("user");
    const { spreadsheetId, sheetName } = c.req.valid("query");

    // Create sync log entry
    const [syncLog] = await db
      .insert(syncLogs)
      .values({
        spreadsheetId,
        status: "in_progress",
      })
      .returning();

    const workouts = await fetchWorkoutLogData(
      user.id,
      spreadsheetId,
      sheetName
    );

    // Update sync log
    await db
      .update(syncLogs)
      .set({
        status: "success",
        rowsProcessed: workouts.reduce(
          (acc, workout) => acc + workout.exercises.length,
          0
        ),
        completedAt: new Date(),
      })
      .where(eq(syncLogs.id, syncLog.id));

    return c.json({
      success: true,
      data: {
        workouts,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/sheets/status
 * Get last sync status
 */
sheetsRoutes.get("/status", async (c) => {
  try {
    const [lastSync] = await db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.startedAt))
      .limit(1);

    return c.json({
      success: true,
      data: {
        lastSyncedAt: lastSync?.completedAt?.toISOString() || null,
        isSyncing: lastSync?.status === "in_progress",
        error: lastSync?.error || undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/sheets/update-cell
 * Update a specific cell in the sheet
 */
const updateCellSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Sheet1"),
  row: z.number().min(1),
  col: z.string().min(1).max(3),
  weight: z.number().min(0),
  reps: z.number().min(0),
});

sheetsRoutes.post(
  "/update-cell",
  zValidator("json", updateCellSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName, row, col, weight, reps } =
        c.req.valid("json");
      const value = formatSetValue(weight, reps);

      await updateCell(user.id, spreadsheetId, sheetName, row, col, value);

      return c.json({
        success: true,
        data: { row, col, value },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * POST /api/sheets/workout-log/create
 * Create a new workout log sheet with normalized structure
 */
const createLogSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Workout Log"),
});

sheetsRoutes.post(
  "/workout-log/create",
  zValidator("json", createLogSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName } = c.req.valid("json");

      // Check if sheet already exists
      const exists = await sheetExists(user.id, spreadsheetId, sheetName);
      if (exists) {
        return c.json({
          success: true,
          data: { sheetName, created: false, message: "Sheet already exists" },
        });
      }

      await createWorkoutLogSheet(user.id, spreadsheetId, sheetName);

      return c.json({
        success: true,
        data: { sheetName, created: true },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/sheets/workout-log/check
 * Check if workout log sheet exists
 */
const checkLogSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Workout Log"),
});

sheetsRoutes.get(
  "/workout-log/check",
  zValidator("query", checkLogSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName } = c.req.valid("query");

      const exists = await sheetExists(user.id, spreadsheetId, sheetName);

      return c.json({
        success: true,
        data: { exists, sheetName },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * POST /api/sheets/workout-log/entries
 * Add workout entries to the log
 */
const addEntriesSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Workout Log"),
  entries: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      day: z.enum([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]),
      exercise: z.string().min(1),
      warmup: z
        .object({
          weight: z.number().min(0),
          reps: z.number().min(0),
        })
        .optional(),
      sets: z.array(
        z.object({
          weight: z.number().min(0),
          reps: z.number().min(0),
        })
      ),
      groupId: z.string().optional(), // ID for linking superset exercises (e.g., "SS1")
      groupType: z.enum(["superset"]).optional(), // Type of grouping
    })
  ),
});

sheetsRoutes.post(
  "/workout-log/entries",
  zValidator("json", addEntriesSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { spreadsheetId, sheetName, entries } = c.req.valid("json");

      const count = await appendWorkoutEntries(
        user.id,
        spreadsheetId,
        sheetName,
        entries as WorkoutLogEntry[]
      );

      return c.json({
        success: true,
        data: { entriesAdded: count },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * GET /api/sheets/workout-log/sync
 * Sync data from workout log sheet (normalized format)
 */
const syncLogSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().optional().default("Workout Log"),
});

sheetsRoutes.get(
  "/workout-log/sync",
  zValidator("query", syncLogSchema),
  async (c) => {
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
        data: {
          workouts,
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ success: false, error: message }, 500);
    }
  }
);
