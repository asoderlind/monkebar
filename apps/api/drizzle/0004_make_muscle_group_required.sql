-- Migration: Make muscle_group column required
-- Set default value for exercises without muscle group, then make column NOT NULL

-- Update any existing exercises that have NULL muscle_group to 'Core' as default
UPDATE "exercise_master" 
SET "muscle_group" = 'Core' 
WHERE "muscle_group" IS NULL;

-- Make the column NOT NULL
ALTER TABLE "exercise_master" 
ALTER COLUMN "muscle_group" SET NOT NULL;
