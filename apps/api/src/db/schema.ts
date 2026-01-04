import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================================
// Auth Tables (better-auth)
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Workout Sessions - Represents a single day's workout
// ============================================================================

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: serial("id").primaryKey(),
    weekNumber: integer("week_number").notNull(),
    dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(),
    date: date("date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("session_unique_idx").on(table.weekNumber, table.dayOfWeek),
  ]
);

// ============================================================================
// Exercises - Individual exercises performed in a session
// ============================================================================

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => workoutSessions.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  orderIndex: integer("order_index").notNull(), // Order within the day
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Sets - Individual sets for each exercise
// ============================================================================

export const sets = pgTable("sets", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id, { onDelete: "cascade" })
    .notNull(),
  setNumber: integer("set_number").notNull(), // 0 = warmup, 1-4 = working sets
  weight: decimal("weight", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  isWarmup: boolean("is_warmup").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Sync Log - Track Google Sheets synchronization
// ============================================================================

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  spreadsheetId: varchar("spreadsheet_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // 'success', 'error', 'in_progress'
  rowsProcessed: integer("rows_processed").default(0),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ============================================================================
// Exercise Master List - Normalized exercise names
// ============================================================================

export const exerciseMaster = pgTable("exercise_master", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  muscleGroup: varchar("muscle_group", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for use in the app
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;

export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;

export type ExerciseMaster = typeof exerciseMaster.$inferSelect;
export type NewExerciseMaster = typeof exerciseMaster.$inferInsert;
