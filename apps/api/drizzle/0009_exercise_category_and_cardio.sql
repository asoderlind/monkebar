-- ============================================================
-- Migration: exercise category, exercises FK, cardio_sessions
-- Idempotent: safe to run multiple times
-- ============================================================

-- 1. Add category column to exercise_master (IF NOT EXISTS)
ALTER TABLE "exercise_master"
  ADD COLUMN IF NOT EXISTS "category" varchar(20) NOT NULL DEFAULT 'Strength';

-- 2. Add nullable FK from exercises to exercise_master (IF NOT EXISTS)
ALTER TABLE "exercises"
  ADD COLUMN IF NOT EXISTS "exercise_master_id" integer
    REFERENCES "exercise_master"("id") ON DELETE SET NULL;

-- 3. Backfill exercise_master_id by matching name + user (only fills NULLs, idempotent)
UPDATE "exercises" e
SET exercise_master_id = em.id
FROM "workout_sessions" ws, "exercise_master" em
WHERE e.session_id = ws.id
  AND LOWER(em.name) = LOWER(e.name)
  AND em.user_id = ws.user_id
  AND em.deleted_at IS NULL
  AND e.exercise_master_id IS NULL;

-- 4. Create dedicated cardio_sessions table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "cardio_sessions" (
  "id"          serial PRIMARY KEY,
  "exercise_id" integer NOT NULL UNIQUE REFERENCES "exercises"("id") ON DELETE CASCADE,
  "duration"    integer NOT NULL,           -- seconds
  "level"       integer,                    -- machine resistance level (nullable)
  "distance"    numeric(6, 2),              -- km (nullable)
  "created_at"  timestamp DEFAULT now() NOT NULL
);
