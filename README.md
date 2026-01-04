# 🦍 Monke Bar - Workout Tracker

A mobile-friendly workout tracking app that syncs with Google Sheets, providing analytics and trends while keeping your spreadsheet as the source of truth.

## Features

- 📱 **Mobile-first UI** - Swipe through days, tap to view exercises
- 📊 **Analytics Dashboard** - Best sets, volume trends, exercise progress
- 🔄 **Google Sheets Sync** - Your spreadsheet remains the source of truth
- 📈 **Trend Analysis** - Track PRs, weekly volume, and exercise progression
- 🏋️ **Exercise History** - View all workout data for any exercise
- 🔐 **Google OAuth** - Login with your Google account to access your sheets

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui, React Query, Recharts
- **Backend**: Hono, Drizzle ORM, PostgreSQL, better-auth
- **Integration**: Google Sheets API via OAuth 2.0

## Spreadsheet Format

Your Google Sheet should follow this format:

| Week | Exercise (Mon) | Warmup | Set 1  | Set 2  | Set 3  | Set 4 | Exercise (Tue) | ... |
| ---- | -------------- | ------ | ------ | ------ | ------ | ----- | -------------- | --- |
| 1    | Bench Press    | 40kg,5 | 70kg,6 | 70kg,6 | 70kg,5 |       | Squat          | ... |
| 1    | Rows           |        | 60kg,8 | 60kg,8 | 60kg,8 |       | Deadlift       | ... |

- **Week column (A)**: Week number
- **Days**: Monday (B-G), Tuesday (H-M), etc.
- **Set format**: `{weight}kg, {reps}` (e.g., "70kg, 6")

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or Docker)
- Google Cloud Project with OAuth credentials

### 1. Clone and Install

```bash
git clone <repo-url>
cd monke-bar
pnpm install
```

### 2. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Sheets API** and **Google Drive API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth 2.0 Client IDs**
6. Select **Web application**
7. Add authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with your values:

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

With Docker:

```bash
docker compose -f docker-compose.dev.yml up db -d
```

Or use your own PostgreSQL instance.

### 5. Run Migrations

```bash
pnpm db:push
```

### 6. Start Development Servers

```bash
pnpm dev
```

This starts:

- API: http://localhost:3001
- Web: http://localhost:5173

## Development

### Commands

```bash
# Start all services
pnpm dev

# Start individual services
pnpm dev:web
pnpm dev:api

# Database
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema (dev)
pnpm db:studio    # Open Drizzle Studio

# Build
pnpm build

# Lint
pnpm lint
```

### Project Structure

```
monke-bar/
├── apps/
│   ├── api/           # Hono backend
│   │   ├── src/
│   │   │   ├── db/       # Drizzle schema & connection
│   │   │   ├── lib/      # Google Sheets service
│   │   │   └── routes/   # API routes
│   │   └── drizzle/      # Migrations
│   └── web/           # React frontend
│       └── src/
│           ├── components/
│           │   ├── ui/       # shadcn components
│           │   └── views/    # Page views
│           ├── hooks/        # React Query hooks
│           └── lib/          # API client
└── packages/
    └── shared/        # Shared TypeScript types
```

## API Endpoints

### Workouts

- `GET /api/workouts` - Get all workout weeks
- `GET /api/workouts/latest` - Get most recent week
- `GET /api/workouts/week/:number` - Get specific week
- `GET /api/workouts/exercises` - List all exercises
- `GET /api/workouts/exercise/:name` - Get exercise history

### Analytics

- `GET /api/analytics/best-sets?weeks=4` - Best sets per exercise
- `GET /api/analytics/exercise/:name/trends` - Exercise trends
- `GET /api/analytics/exercise/:name/stats` - Exercise stats
- `GET /api/analytics/volume-history` - Volume over time
- `GET /api/analytics/summary` - Overall summary

### Sheets

- `GET /api/sheets/sync` - Sync from Google Sheets
- `GET /api/sheets/status` - Get sync status
- `POST /api/sheets/update-cell` - Update a cell

## Docker

### Development

```bash
docker compose -f docker-compose.dev.yml up
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

## License

MIT
