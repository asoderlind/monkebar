import { db } from "./index.js";
import { exerciseMaster } from "./schema.js";
import type { MuscleGroup } from "@monke-bar/shared";
import { sql } from "drizzle-orm";

// Template for manually adding exercises to seed database
// Add exercises in the format: { name: "Exercise Name", muscleGroup: "MuscleGroup" }
const exercisesToSeed: Array<{ name: string; muscleGroup: MuscleGroup }> = [
  // Example:
  // { name: "Bench Press", muscleGroup: "Chest" },
  // { name: "Squat", muscleGroup: "Legs" },
];

async function seedExercises() {
  console.log("🌱 Seeding exercises...");

  if (exercisesToSeed.length === 0) {
    console.log(
      "⚠️  No exercises to seed. Add exercises to the exercisesToSeed array."
    );
    process.exit(0);
  }

  try {
    // Insert exercises, skip if they already exist (on conflict do nothing)
    for (const exercise of exercisesToSeed) {
      const existing = await db
        .select()
        .from(exerciseMaster)
        .where(
          sql`LOWER(${exerciseMaster.name}) = LOWER(${exercise.name}) AND ${exerciseMaster.deletedAt} IS NULL`
        );

      if (existing.length === 0) {
        await db.insert(exerciseMaster).values(exercise);
        console.log(`✅ Added: ${exercise.name} (${exercise.muscleGroup})`);
      } else {
        console.log(`⏭️  Skipped: ${exercise.name} (already exists)`);
      }
    }

    console.log("✨ Exercise seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding exercises:", error);
    process.exit(1);
  }
}

seedExercises();
