# Cosmic Coach — Workspace

## Overview

pnpm workspace monorepo using TypeScript. AI-powered speech coaching platform with dark glassmorphism UI.

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

## Artifacts

- `artifacts/cosmic-coach` — React + Vite frontend (dark cosmic theme), preview path `/`
- `artifacts/api-server` — Express API server, preview path `/api`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

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

## DB Schema

`sessions` table: `id`, `title`, `speakerName`, `duration`, `status` (enum), `overallScore`, `energyLevel`, `eyeContactScore`, `confidenceScore`, `fillerWordCount`, `createdAt`, `transcriptData` (jsonb), `analysisData` (jsonb), `waveformData` (jsonb), `errorMessage`
