import { db } from "./index.js";
import { exerciseMaster } from "./schema.js";
import type { MuscleGroup } from "@monke-bar/shared";
import { sql } from "drizzle-orm";

// Default exercises to seed for new users
const defaultExercises: Array<{ name: string; muscleGroup: MuscleGroup }> = [
  // Chest
  { name: "Bench Press", muscleGroup: "Chest" },
  { name: "Incline Bench Press", muscleGroup: "Chest" },
  { name: "Decline Bench Press", muscleGroup: "Chest" },
  { name: "Dumbbell Bench Press", muscleGroup: "Chest" },
  { name: "Dumbbell Flyes", muscleGroup: "Chest" },
  { name: "Cable Flyes", muscleGroup: "Chest" },
  { name: "Push-ups", muscleGroup: "Chest" },
  { name: "Chest Dips", muscleGroup: "Chest" },

  // Back
  { name: "Deadlift", muscleGroup: "Back" },
  { name: "Barbell Row", muscleGroup: "Back" },
  { name: "Dumbbell Row", muscleGroup: "Back" },
  { name: "Pull-ups", muscleGroup: "Back" },
  { name: "Chin-ups", muscleGroup: "Back" },
  { name: "Lat Pulldown", muscleGroup: "Back" },
  { name: "Seated Cable Row", muscleGroup: "Back" },
  { name: "T-Bar Row", muscleGroup: "Back" },
  { name: "Face Pulls", muscleGroup: "Back" },

  // Shoulders
  { name: "Overhead Press", muscleGroup: "Shoulders" },
  { name: "Seated Dumbbell Press", muscleGroup: "Shoulders" },
  { name: "Arnold Press", muscleGroup: "Shoulders" },
  { name: "Lateral Raises", muscleGroup: "Shoulders" },
  { name: "Front Raises", muscleGroup: "Shoulders" },
  { name: "Rear Delt Flyes", muscleGroup: "Shoulders" },
  { name: "Upright Row", muscleGroup: "Shoulders" },

  // Legs
  { name: "Squat", muscleGroup: "Legs" },
  { name: "Front Squat", muscleGroup: "Legs" },
  { name: "Leg Press", muscleGroup: "Legs" },
  { name: "Leg Extension", muscleGroup: "Legs" },
  { name: "Leg Curl", muscleGroup: "Legs" },
  { name: "Romanian Deadlift", muscleGroup: "Legs" },
  { name: "Lunges", muscleGroup: "Legs" },
  { name: "Bulgarian Split Squat", muscleGroup: "Legs" },
  { name: "Calf Raises", muscleGroup: "Legs" },

  // Biceps
  { name: "Barbell Curl", muscleGroup: "Biceps" },
  { name: "Dumbbell Curl", muscleGroup: "Biceps" },
  { name: "Hammer Curl", muscleGroup: "Biceps" },
  { name: "Preacher Curl", muscleGroup: "Biceps" },
  { name: "Cable Curl", muscleGroup: "Biceps" },
  { name: "Concentration Curl", muscleGroup: "Biceps" },

  // Triceps
  { name: "Tricep Dips", muscleGroup: "Triceps" },
  { name: "Close-Grip Bench Press", muscleGroup: "Triceps" },
  { name: "Skull Crushers", muscleGroup: "Triceps" },
  { name: "Overhead Tricep Extension", muscleGroup: "Triceps" },
  { name: "Tricep Pushdown", muscleGroup: "Triceps" },
  { name: "Diamond Push-ups", muscleGroup: "Triceps" },

  // Core
  { name: "Plank", muscleGroup: "Core" },
  { name: "Side Plank", muscleGroup: "Core" },
  { name: "Crunches", muscleGroup: "Core" },
  { name: "Russian Twists", muscleGroup: "Core" },
  { name: "Hanging Leg Raises", muscleGroup: "Core" },
  { name: "Ab Wheel Rollout", muscleGroup: "Core" },
  { name: "Cable Crunches", muscleGroup: "Core" },
];

/**
 * Seed default exercises for a new user
 * This function is called when a new user registers
 */
export async function seedDefaultExercisesForUser(
  userId: string
): Promise<void> {
  try {
    console.log(`🌱 Seeding default exercises for user ${userId}...`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const exercise of defaultExercises) {
      // Check if exercise already exists for this user (case-insensitive)
      const existing = await db
        .select()
        .from(exerciseMaster)
        .where(
          sql`${exerciseMaster.userId} = ${userId} AND LOWER(${exerciseMaster.name}) = LOWER(${exercise.name}) AND ${exerciseMaster.deletedAt} IS NULL`
        );

      if (existing.length === 0) {
        await db.insert(exerciseMaster).values({
          userId,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
        });
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(
      `✅ Seeded ${addedCount} exercises for user ${userId} (${skippedCount} skipped)`
    );
  } catch (error) {
    console.error(`❌ Error seeding exercises for user ${userId}:`, error);
    throw error;
  }
}

// Manual seeding script (for CLI usage)
async function seedExercisesManual() {
  console.log("🌱 Manual exercise seeding...");
  console.log(
    "⚠️  This script requires a userId. Use seedDefaultExercisesForUser(userId) instead."
  );
  console.log(
    "💡 Default exercises are now automatically seeded when a user registers."
  );
  process.exit(0);
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExercisesManual();
}
