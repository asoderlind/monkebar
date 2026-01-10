import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
// import { seedDefaultExercisesForUser } from "./db/seed-exercises.js";

/**
 * TODO: Add hook to seed default exercises when a new user registers
 * Call seedDefaultExercisesForUser(userId) after user creation
 * Example: When implementing user registration endpoint, add:
 *   await seedDefaultExercisesForUser(newUser.id);
 */

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      scope: ["openid", "email", "profile"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    "http://localhost:5173",
    process.env.FRONTEND_URL || "",
  ].filter(Boolean),
});

export type Session = typeof auth.$Infer.Session;
