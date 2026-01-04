# Agent description

You are Claude, a large language model trained by Anthropic. You are a proffesional software engineer with expertise in full-stack development, TypeScript, React, Node.js, and database design. You excel at creating clear and comprehensive technical documentation. You have a deep understanding of modern web development tools and best practices. You write clean, maintainable code and documentation that is easy to follow.

# Tech Stack Documentation

This document outlines the technology stack and folder structure of this monorepo project, designed for reuse in similar full-stack applications (e.g., workout tracking app with Google Sheets integration).

## Project Architecture

**Monorepo Structure** using pnpm workspaces with the following organization:

- `apps/` - Application packages (web frontend, API backend)
- `packages/` - Shared libraries and utilities
- Docker support for both development and production

## Core Technologies

### Package Management

- **pnpm** (v9.15.0) - Fast, efficient package manager with workspace support
- **pnpm workspaces** - Monorepo management defined in `pnpm-workspace.yaml`

### Language & Runtime

- **TypeScript** (~5.9.3) - Type-safe development across all packages
- **Node.js** - Backend runtime

## Frontend Stack (`apps/web`)

### Framework & Build Tools

- **React** (19.2.0) - UI library
- **Vite** (7.2.4) - Fast build tool and dev server
  - `@vitejs/plugin-react` - React Fast Refresh support
  - HMR (Hot Module Replacement) enabled
  - Proxy configuration for API requests

### Styling

- **Tailwind CSS** (4.1.18) - Utility-first CSS framework
  - `@tailwindcss/vite` - Vite integration
  - `tailwind-merge` - Utility for merging Tailwind classes
  - `tw-animate-css` - Animation utilities
- **CSS Variables** - For theming support
- **class-variance-authority** (CVA) - Component variant styling

### UI Component Library

- **shadcn/ui** - Copy-paste component system (New York style)
  - Components stored in `src/components/ui/`
  - Configuration in `components.json`
  - Base color: neutral
  - CSS variables enabled
- **Radix UI** - Headless UI primitives:
  - `@radix-ui/react-checkbox`
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-label`
  - `@radix-ui/react-select`
  - `@radix-ui/react-slot`
  - `@radix-ui/react-tabs`
- **lucide-react** - Icon library

### State Management & Data Fetching

- **TanStack React Query** (5.90.12) - Server state management
  - Query caching with 5-minute stale time
  - Automatic refetching and retry logic
  - Configured in `main.tsx`

### Theming & Notifications

- **next-themes** - Theme management (dark/light mode support)
- **sonner** - Toast notifications
- **framer-motion** - Animation library

### Utilities

- **date-fns** - Date manipulation and formatting
- **xlsx** (SheetJS) - Excel file parsing and generation (useful for Google Sheets integration)
- **clsx** - Conditional class name utility

### Authentication

- **better-auth** (1.2.0) - Modern authentication library
  - Client-side auth utilities

### Development Tools

- **ESLint** (9.39.1) - Linting with TypeScript support
  - `eslint-plugin-react-hooks` - React Hooks linting
  - `eslint-plugin-react-refresh` - React Refresh linting
  - `typescript-eslint` - TypeScript ESLint rules
- **Vitest** (4.0.16) - Unit testing framework
  - Global test utilities enabled
  - Node environment for tests

## Backend Stack (`apps/api`)

### Framework

- **Hono** (4.6.16) - Fast, lightweight web framework
  - `@hono/node-server` - Node.js server adapter
  - `@hono/zod-validator` - Request validation middleware
  - Built-in CORS and logger middleware

### Database

- **PostgreSQL** - Relational database
- **Drizzle ORM** (0.41.0) - Type-safe ORM
  - `drizzle-kit` - Schema management and migrations
  - Schema-first approach
  - Type-safe queries with auto-completion
  - Migration files stored in `drizzle/` directory
- **pg** - PostgreSQL client

### Validation

- **Zod** (4.3.4) - Schema validation and type inference
  - Used for API request/response validation
  - Integrated with Hono validator

### Authentication

- **better-auth** (1.4.10) - Server-side authentication
  - Session management
  - User authentication flows

### Development Tools

- **tsx** (4.19.2) - TypeScript execution with watch mode
  - Used for development server with auto-reload

## Shared Package (`packages/shared`)

### Purpose

- Shared TypeScript types and utilities
- Used by both frontend and backend
- Ensures type consistency across the monorepo

### Configuration

- Compiled to CommonJS/ESM
- Type definitions exported
- Referenced via workspace protocol: `workspace:*`

## Folder Structure

```
pay-splitter/
├── apps/
│   ├── api/                          # Backend API
│   │   ├── src/
│   │   │   ├── auth.ts              # Authentication setup
│   │   │   ├── index.ts             # Server entry point
│   │   │   ├── db/
│   │   │   │   ├── index.ts         # Database connection
│   │   │   │   ├── schema.ts        # Drizzle schema definitions
│   │   │   │   └── migrate.ts       # Migration runner
│   │   │   ├── lib/
│   │   │   │   ├── errors.ts        # Custom error classes
│   │   │   │   └── validation.ts    # Validation utilities
│   │   │   └── routes/
│   │   │       ├── households.ts    # Household endpoints
│   │   │       └── transactions.ts  # Transaction endpoints
│   │   ├── drizzle/                 # Migration files
│   │   ├── drizzle.config.ts        # Drizzle configuration
│   │   ├── tsconfig.json            # TypeScript config
│   │   ├── package.json
│   │   ├── Dockerfile               # Production container
│   │   └── Dockerfile.dev           # Development container
│   │
│   └── web/                          # Frontend application
│       ├── src/
│       │   ├── main.tsx             # Application entry point
│       │   ├── App.tsx              # Root component
│       │   ├── index.css            # Global styles
│       │   ├── components/
│       │   │   ├── ui/              # shadcn/ui components
│       │   │   ├── import/          # Import-related components
│       │   │   ├── settlement/      # Settlement components
│       │   │   ├── transactions/    # Transaction components
│       │   │   ├── views/           # Page-level views
│       │   │   ├── ErrorBoundary.tsx
│       │   │   └── FloatingActionBar.tsx
│       │   ├── hooks/               # Custom React hooks
│       │   │   ├── useAppState.ts
│       │   │   ├── useTheme.ts
│       │   │   └── useTransactions.ts
│       │   ├── lib/
│       │   │   ├── api/             # API client utilities
│       │   │   ├── parsers/         # Data parsing utilities
│       │   │   ├── auth-client.ts   # Authentication client
│       │   │   ├── settlement.ts    # Business logic
│       │   │   └── utils.ts         # General utilities
│       │   └── types/
│       │       └── index.ts         # TypeScript type definitions
│       ├── public/                  # Static assets
│       ├── components.json          # shadcn/ui configuration
│       ├── vite.config.ts           # Vite configuration
│       ├── tsconfig.json            # TypeScript project config
│       ├── tsconfig.app.json        # App-specific TS config
│       ├── tsconfig.node.json       # Node-specific TS config
│       ├── eslint.config.js         # ESLint configuration
│       ├── package.json
│       ├── Dockerfile               # Production container
│       ├── Dockerfile.dev           # Development container
│       └── index.html               # HTML entry point
│
├── packages/
│   └── shared/                      # Shared code
│       ├── src/
│       │   └── index.ts             # Shared types/utilities
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.dev.yml           # Development containers
├── docker-compose.prod.yml          # Production containers
├── pnpm-workspace.yaml              # Workspace configuration
├── pnpm-lock.yaml                   # Lockfile
├── package.json                     # Root package config
└── README.md
```

## Development Patterns

### Path Aliases

TypeScript path aliases configured in all packages:

```json
{
  "@/*": ["./src/*"]
}
```

Used throughout the codebase for clean imports:

```typescript
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
```

### Component Organization

- **UI Components** (`components/ui/`) - Reusable primitive components
- **Feature Components** (`components/[feature]/`) - Domain-specific components
- **Views** (`components/views/`) - Page-level components
- **Hooks** (`hooks/`) - Custom React hooks for logic reuse

### API Structure

- **Routes** - Organized by resource (`routes/households.ts`, `routes/transactions.ts`)
- **Middleware** - Authentication, CORS, logging in `index.ts`
- **Error Handling** - Custom error classes with status codes
- **Validation** - Zod schemas for request/response validation

### Database Schema

- **Schema-first** approach with Drizzle ORM
- Type-safe queries derived from schema
- Migrations managed via `drizzle-kit`
- Commands:
  - `pnpm db:generate` - Generate migration files
  - `pnpm db:migrate` - Run migrations
  - `pnpm db:push` - Push schema changes directly (dev)

### Authentication Flow

- **better-auth** handles session management
- Session stored in database
- Protected routes use middleware to verify session
- Frontend uses auth client for login/logout

## Scripts & Commands

### Root Level

```bash
pnpm dev          # Run all apps in dev mode (parallel)
pnpm dev:web      # Run only web app
pnpm dev:api      # Run only API
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm test         # Run tests in all packages
```

### API-Specific

```bash
pnpm dev          # Watch mode with tsx
pnpm build        # Compile TypeScript
pnpm start        # Run compiled JS
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema to DB
pnpm db:studio    # Open Drizzle Studio
```

### Web-Specific

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm test         # Run Vitest
pnpm test:run     # Run tests once (CI mode)
```

## Docker Setup

### Development

- `docker-compose.dev.yml` - Development containers with hot reload
- Separate Dockerfiles for web and API (`Dockerfile.dev`)

### Production

- `docker-compose.prod.yml` - Optimized production containers
- Multi-stage builds for smaller images
- Production Dockerfiles (`Dockerfile`)

## Environment Variables

### API

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `BETTER_AUTH_URL` - Frontend URL for CORS

### Web

- API proxy configured in `vite.config.ts` to forward `/api` requests to `http://localhost:3000`

## Key Features for Reuse

### For Google Sheets Integration

1. **xlsx library** already included for spreadsheet parsing
2. **React Query** for data fetching and caching
3. **Zod** for validating imported data
4. **Drizzle ORM** for syncing data to database
5. **Custom hooks pattern** for business logic separation

### Recommended Additions for Workout App

1. **Google Sheets API** - For real-time sync
2. **Charts library** - For workout progress visualization (e.g., Recharts, Chart.js)
3. **Date utilities** - Already have date-fns
4. **Form handling** - Consider React Hook Form + Zod for workout entry forms

## TypeScript Configuration

- Strict mode enabled
- Path aliases configured
- Project references for monorepo structure
- Separate configs for app code vs. build tooling

## Testing Strategy

- **Vitest** for unit/integration tests
- Global test utilities enabled
- Node environment (can switch to jsdom for DOM testing)
- Test commands available at package and root level

---

## Summary

This stack provides a modern, type-safe full-stack application with:

- ✅ Monorepo structure for code sharing
- ✅ Fast development with HMR and watch mode
- ✅ Type safety across frontend and backend
- ✅ Modern UI with shadcn/ui and Tailwind
- ✅ Robust data fetching with React Query
- ✅ Type-safe database with Drizzle ORM
- ✅ Authentication built-in
- ✅ Docker support for deployment
- ✅ Excel/Sheets handling capabilities
- ✅ Comprehensive validation with Zod

This architecture is well-suited for a workout tracking app with Google Sheets integration, where you can:

- Import workout data from Google Sheets
- Sync data bidirectionally
- Display progress with charts
- Track exercises, sets, reps, weights
- Handle user authentication
- Store historical data in PostgreSQL
