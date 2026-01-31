import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { workoutsRoutes } from "./routes/workouts.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { exercisesRoutes } from "./routes/exercises.js";
import { measurementsRoutes } from "./routes/measurements.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (handled by better-auth)
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Routes
app.route("/api/workouts", workoutsRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/exercises", exercisesRoutes);
app.route("/api/measurements", measurementsRoutes);

const port = parseInt(process.env.PORT || "3001");

console.log(`🏋️ Monkebar API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
