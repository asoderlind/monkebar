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
import { relations } from "drizzle-orm";

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
  value: text("value").notNull(),
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
    userId: varchar("user_id", { length: 36 })
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    weekNumber: integer("week_number").notNull(),
    dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(),
    date: date("date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("session_unique_idx").on(
      table.userId,
      table.weekNumber,
      table.dayOfWeek
    ),
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
  groupId: varchar("group_id", { length: 50 }), // ID for linking superset exercises (e.g., "SS1")
  groupType: varchar("group_type", { length: 20 }), // Type of grouping: "superset"
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
// Exercise Master List - Normalized exercise names
// ============================================================================

export const exerciseMaster = pgTable(
  "exercise_master",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    muscleGroup: varchar("muscle_group", { length: 100 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("exercise_user_name_idx").on(table.userId, table.name),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  workoutSessions: many(workoutSessions),
  exerciseMaster: many(exerciseMaster),
}));

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    exercises: many(exercises),
  })
);

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  session: one(workoutSessions, {
    fields: [exercises.sessionId],
    references: [workoutSessions.id],
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  exercise: one(exercises, {
    fields: [sets.exerciseId],
    references: [exercises.id],
  }),
}));

export const exerciseMasterRelations = relations(exerciseMaster, ({ one }) => ({
  user: one(users, {
    fields: [exerciseMaster.userId],
    references: [users.id],
  }),
}));

// Type exports for use in the app
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;

export type ExerciseMaster = typeof exerciseMaster.$inferSelect;
export type NewExerciseMaster = typeof exerciseMaster.$inferInsert;
