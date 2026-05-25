# math-game — Claude Code Instructions

## Project Overview
Educational math + English learning game for kids. Built with Next.js 16 App Router, Supabase (auth + DB + storage), and Gemini API for AI-generated flashcard images.

## Stack
- **Framework**: Next.js 16 App Router (React 19, TypeScript)
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase — auth, Postgres DB, storage (audio + images)
- **AI**: Gemini API (`gemini-2.5-flash-image`) for vocabulary flashcard image generation
- **TTS**: `msedge-tts` for English word audio generation
- **Dev port**: 3001 (`npm run dev`)

## Environment Variables
All secrets live in `.env.local` (gitignored). Never hardcode values.

| Variable | Used in |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions only — never expose to client |
| `GEMINI_API_KEY` | Server actions + API routes only |

Copy `.env.example` → `.env.local` and fill in real values to run locally.

## Architecture

### Key directories
- `src/app/` — Next.js App Router pages and layouts
- `src/app/actions/` — Server Actions (`'use server'`) — all DB writes, AI calls, TTS
- `src/app/api/` — API Routes (REST endpoints)
- `src/components/` — React components split by domain (`math/`, `english/`, `shared/`)
- `src/context/` — React context (`PlayerContext` — active player state)
- `src/lib/` — Shared logic (`supabase.ts`, `math-logic.ts`, `english-logic.ts`, `utils.ts`)
- `src/types/` — TypeScript interfaces

### Data flow
- Supabase client (`src/lib/supabase.ts`) uses the anon key — safe for browser
- Server Actions use `SUPABASE_SERVICE_ROLE_KEY` for privileged operations (no RLS bypass needed on client)
- Gemini API key is only ever accessed inside Server Actions and API Routes — never reaches the browser

### Auth
- Custom auth via Supabase (email/password)
- `AuthGuard` component wraps protected pages
- Player profiles stored in `players` table; active player in `PlayerContext`

## SQL Migrations
Loose `.sql` files at repo root (`schema_update.sql`, `session_history_migration.sql`, `rls_migration.sql`) — run manually against Supabase. Not auto-applied.

## Coding Conventions
- No comments unless the WHY is non-obvious
- No error handling for impossible cases
- Server Actions validate env vars at call time and return `{ error: string }` on failure
- Audio files uploaded to `audio` bucket, images to `images` bucket in Supabase Storage
