-- Drop sync_logs table if it exists
ALTER TABLE IF EXISTS "sync_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "sync_logs" CASCADE;--> statement-breakpoint

-- Drop old constraints and indexes
ALTER TABLE "exercise_master" DROP CONSTRAINT IF EXISTS "exercise_master_name_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "session_unique_idx";--> statement-breakpoint

-- Add user_id columns as nullable first (to allow existing data) - idempotent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercise_master' AND column_name = 'user_id') THEN
    ALTER TABLE "exercise_master" ADD COLUMN "user_id" varchar(36);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE "workout_sessions" ADD COLUMN "user_id" varchar(36);
  END IF;
END $$;--> statement-breakpoint

-- Populate existing records with first user's ID
DO $$
DECLARE
  first_user_id varchar(36);
BEGIN
  -- Get the first user's ID
  SELECT id INTO first_user_id FROM users ORDER BY created_at LIMIT 1;

  -- Only proceed if there are users
  IF first_user_id IS NOT NULL THEN
    -- Update existing exercise_master records
    UPDATE exercise_master SET user_id = first_user_id WHERE user_id IS NULL;

    -- Update existing workout_sessions records
    UPDATE workout_sessions SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;--> statement-breakpoint

-- Make user_id NOT NULL after populating existing data (idempotent - SET NOT NULL is safe to run multiple times)
ALTER TABLE "exercise_master" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

-- Add foreign key constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'exercise_master_user_id_users_id_fk') THEN
    ALTER TABLE "exercise_master" ADD CONSTRAINT "exercise_master_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'workout_sessions_user_id_users_id_fk') THEN
    ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

-- Create new unique indexes (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "exercise_user_name_idx" ON "exercise_master" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_unique_idx" ON "workout_sessions" USING btree ("user_id","week_number","day_of_week");