# Cosmic Coach — Workspace

## Overview

pnpm workspace monorepo using TypeScript. AI-powered speech coaching platform with dark glassmorphism UI, full Clerk auth, and Stripe billing.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle, externals: `openai`, `p-limit`, `p-retry`)
- **Frontend**: React + Vite + Tailwind CSS v4 + Framer Motion + Recharts
- **AI**: OpenAI Whisper (`gpt-4o-mini-transcribe`) + GPT-5 analysis
- **Auth**: Clerk (Replit-managed) — `@clerk/react` (frontend), `@clerk/express` (API)
- **Payments**: Stripe via `stripe-replit-sync` — manages `stripe.*` tables in PostgreSQL

## Artifacts

- `artifacts/cosmic-coach` — React + Vite frontend (dark cosmic theme), preview path `/`
- `artifacts/api-server` — Express API server, preview path `/api`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Auth Flow (Clerk)

- Landing page at `/` for signed-out users
- `ClerkProvider` wraps all routes in `App.tsx`
- `requireAuth` middleware in API server reads `getAuth(req).userId`
- Clerk proxy middleware at `/api/__clerk` (production only — dev uses Clerk CDN directly)
- User record upserted on first `GET /api/users/me` call
- `VITE_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` are set via Replit Auth integration

## Payments Flow (Stripe)

- Stripe connected via Replit Integrations (sets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`)
- `stripe-replit-sync` syncs Stripe data to `stripe.*` PostgreSQL schema tables
- Webhook at `POST /api/stripe/webhook` with `express.raw()` body
- `GET /api/users/me` checks `stripe.subscriptions` for `active`/`trialing` status → `isPremium`
- Checkout: `POST /api/billing/checkout` → Stripe checkout session with 7-day trial
- Portal: `POST /api/billing/portal` → Stripe customer portal session
- Products: `GET /api/billing/products` → reads `stripe.products` + `stripe.prices`

## Admin System

- Exactly 2 admin accounts supported — controlled by `ADMIN_EMAILS` env var (comma-separated emails)
- Set `ADMIN_EMAILS=you@example.com,other@example.com` in Secrets/Environment to activate admin accounts
- Admin users automatically get `isPremium: true` (bypass all gates) and `isAdmin: true` from `GET /api/users/me`
- Admin-only sidebar item: "Admin Panel" (shield icon) → `/admin`
- Admin panel shows: global stats (users, sessions, premium count), all users table, all sessions table
- Admin routes: `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/sessions` — 403 for non-admins
- Sidebar shows blue "Admin Access" badge instead of "Upgrade to Pro" for admin users

## Premium Gating (Freemium Bridge)

- **Free**: up to 3 sessions, 25 MB upload limit
- **Pro ($19/mo)**: unlimited sessions, 100 MB uploads, full AI analysis; 7-day free trial
- `usePremiumStatus()` hook → calls `GET /api/users/me`, returns `{ isPremium, priceId, user }`

## AI Pipeline

Upload flow: `POST /api/sessions/upload` (multipart/form-data: `title`, `speakerName`, `media`)
1. Creates session with `status: "processing"`, returns 202 immediately
2. Async: Transcribes audio with Whisper → `buildTranscriptSegments()` (filler word detection)
3. Async: `generateWaveformFromWords()` from timing data
4. Async: `analyzeTranscriptWithAI()` via GPT-5 — returns persuasion, audience personas, impact timeline
5. Updates session to `status: "ready"` with all JSONB data

Frontend polls `/api/sessions/:id` every 4s while `status === "processing"`, shows animated processing view.

## Important Notes

- `lib/api-zod/src/index.ts` — manually maintained to only `export * from "./generated/api"` (orval overwrites it)
- `lib/api-spec/orval.config.ts` — schemas option removed to avoid duplicate exports
- Dark mode: `document.documentElement.classList.add("dark")` in `main.tsx`
- All analysis endpoints fall back to seeded mock data if JSONB columns are null (5 demo sessions)
- `openai`, `p-limit`, `p-retry` are marked as `external` in `build.mjs` and installed in api-server's dependencies
- `lib/db/src/schema/index.ts` exports both `users` and `sessions` tables
- Clerk `Show` component NOT used — replaced with `useAuth()` hooks to avoid blank screen during Clerk load

## DB Schema

`sessions` table: `id`, `userId` (nullable text), `title`, `speakerName`, `duration`, `status` (enum), `overallScore`, `energyLevel`, `eyeContactScore`, `confidenceScore`, `fillerWordCount`, `createdAt`, `transcriptData` (jsonb), `analysisData` (jsonb), `waveformData` (jsonb), `errorMessage`

`users` table: `id` (Clerk userId, PK), `email`, `stripeCustomerId`, `stripeSubscriptionId`, `createdAt`

`stripe.*` tables: managed by `stripe-replit-sync` — includes `stripe.products`, `stripe.prices`, `stripe.subscriptions`
