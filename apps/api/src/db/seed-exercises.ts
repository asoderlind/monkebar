import { db } from "./index.js";
import { exerciseMaster } from "./schema.js";
import { EXERCISE_MUSCLE_GROUPS } from "@monke-bar/shared";
import { sql } from "drizzle-orm";

async function seedExercises() {
  console.log("🌱 Seeding exercises...");

  const exercises = Object.entries(EXERCISE_MUSCLE_GROUPS).map(
    ([name, muscleGroup]) => ({
      name,
      muscleGroup,
    })
  );

  try {
    // Insert exercises, skip if they already exist (on conflict do nothing)
    for (const exercise of exercises) {
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
