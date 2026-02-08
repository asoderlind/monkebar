# 🦍 Monke Bar — Workout Tracker

A mobile-first workout tracking app with analytics, body measurements, and exercise management. Built as a TypeScript monorepo with React, Hono, and PostgreSQL.

## Features

- 📱 **Mobile-first UI** — Log workouts with sets, reps, and weights
- 📊 **Analytics Dashboard** — Best sets, volume trends, exercise progress charts
- 📈 **Trend Analysis** — Track PRs, weekly volume, and exercise progression
- 🏋️ **Exercise Library** — Manage exercises with muscle group categorization and supersets
- 📏 **Body Measurements** — Track weight, body fat, and other measurements over time
- 🗓️ **Workout History** — Calendar view with muscle group heatmap
- 🔐 **Google OAuth** — Secure authentication via better-auth
- 🐳 **Docker Support** — Development and production Docker Compose setups

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui, TanStack React Query, Recharts |
| Backend  | Hono, Drizzle ORM, Zod                                                  |
| Database | PostgreSQL                                                              |
| Auth     | better-auth with Google OAuth                                           |
| Infra    | Docker, Traefik, GitHub Actions CI/CD                                   |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or Docker)
- Google Cloud project with OAuth 2.0 credentials

### 1. Clone and Install

```bash
git clone https://github.com/asoderlind/monke-bar.git
cd monke-bar
pnpm install
```

### 2. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Select **Web application**
6. Add authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monkebar
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
BETTER_AUTH_SECRET=your-random-secret-key-here
BETTER_AUTH_URL=http://localhost:3001
PORT=3001
```

Generate a secure random secret for `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Start Database

```bash
docker compose -f docker-compose.dev.yml up db -d
```

### 5. Run Migrations

```bash
pnpm db:push
```

### 6. Start Development Servers

```bash
pnpm dev
```

- **API:** http://localhost:3001
- **Web:** http://localhost:5173

## Project Structure

```
monke-bar/
├── apps/
│   ├── api/                # Hono REST API
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point & middleware
│   │   │   ├── auth.ts         # better-auth configuration
│   │   │   ├── db/
│   │   │   │   ├── schema.ts   # Drizzle ORM schema
│   │   │   │   ├── index.ts    # Database connection
│   │   │   │   └── migrate.ts  # Migration runner
│   │   │   ├── lib/
│   │   │   │   └── middleware.ts  # Auth middleware
│   │   │   └── routes/
│   │   │       ├── workouts.ts
│   │   │       ├── exercises.ts
│   │   │       ├── analytics.ts
│   │   │       └── measurements.ts
│   │   └── drizzle/            # SQL migration files
│   │
│   └── web/                # React SPA
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── ui/         # shadcn/ui primitives
│           │   ├── views/      # Page-level views
│           │   └── workout/    # Workout logging components
│           ├── hooks/          # React Query hooks
│           └── lib/            # API client, auth, utilities
│
└── packages/
    └── shared/             # Shared TypeScript types
```

## Development Commands

```bash
pnpm dev            # Start all services (API + Web)
pnpm dev:api        # Start API only
pnpm dev:web        # Start Web only
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm test           # Run tests

# Database
pnpm db:generate    # Generate migration files from schema changes
pnpm db:migrate     # Run pending migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio GUI
```

## API Endpoints

All endpoints (except health and auth) require authentication.

| Method           | Endpoint                                      | Description                             |
| ---------------- | --------------------------------------------- | --------------------------------------- |
| `GET`            | `/api/health`                                 | Health check                            |
| `*`              | `/api/auth/**`                                | Authentication (better-auth)            |
| **Workouts**     |                                               |                                         |
| `GET`            | `/api/workouts/db`                            | Get all workouts                        |
| `POST`           | `/api/workouts/db`                            | Log a workout session                   |
| `DELETE`         | `/api/workouts/db`                            | Delete all workouts                     |
| `POST`           | `/api/workouts/db/import`                     | Import workouts (CSV)                   |
| `DELETE`         | `/api/workouts/db/:date/exercise/:exerciseId` | Delete specific exercise from a session |
| **Exercises**    |                                               |                                         |
| `GET`            | `/api/exercises`                              | List all exercises                      |
| `GET`            | `/api/exercises/:id`                          | Get exercise by ID                      |
| `POST`           | `/api/exercises`                              | Create exercise                         |
| `PUT`            | `/api/exercises/:id`                          | Update exercise                         |
| `DELETE`         | `/api/exercises/:id`                          | Delete exercise                         |
| **Analytics**    |                                               |                                         |
| `GET`            | `/api/analytics/best-sets`                    | Best sets per exercise                  |
| `GET`            | `/api/analytics/exercise/:name/trends`        | Exercise trends over time               |
| `GET`            | `/api/analytics/exercise/:name/stats`         | Exercise statistics                     |
| `GET`            | `/api/analytics/volume-history`               | Volume over time                        |
| `GET`            | `/api/analytics/summary`                      | Overall workout summary                 |
| **Measurements** |                                               |                                         |
| `GET`            | `/api/measurements`                           | List all measurements                   |
| `GET`            | `/api/measurements/:id`                       | Get measurement by ID                   |
| `POST`           | `/api/measurements`                           | Create measurement                      |
| `PUT`            | `/api/measurements/:id`                       | Update measurement                      |
| `DELETE`         | `/api/measurements/:id`                       | Delete measurement                      |

## Docker

### Development (with hot reload)

```bash
docker compose -f docker-compose.dev.yml up
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment instructions with GitHub Actions CI/CD.

## License

MIT
