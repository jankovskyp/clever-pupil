# math-game — AI Agent Instructions

## Project
Educational game for kids: math practice + English vocabulary flashcards. Next.js 16 App Router + Supabase + Gemini API.

## Setup
```bash
cp .env.example .env.local   # fill in real values
npm install
npm run dev                  # runs on http://localhost:3001
```

## Environment Variables
Required in `.env.local` (never commit real values):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to client
- `GEMINI_API_KEY` — server-only, never expose to client

## Key Files
| Path | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase browser client (anon key) |
| `src/lib/math-logic.ts` | Math question generation logic |
| `src/lib/english-logic.ts` | English game state machine + audio |
| `src/app/actions/vocabulary.ts` | Server Action: add words, generate images via Gemini, generate audio via TTS |
| `src/app/actions/player.ts` | Server Action: player CRUD |
| `src/app/actions/translate.ts` | Server Action: translation |
| `src/context/PlayerContext.tsx` | Active player React context |
| `src/components/english/EnglishGameContainer.tsx` | Main English game UI |
| `src/components/math/MathGameContainer.tsx` | Main math game UI |

## Security Rules
- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must **only** appear in `src/app/actions/` or `src/app/api/` — never in components, context, or `src/lib/`
- All AI/TTS/Supabase-write calls go through Server Actions (`'use server'`)
- The Supabase browser client uses only the anon key

## Conventions
- TypeScript strict mode
- Tailwind CSS v4 for styling
- No comments unless WHY is non-obvious
- Server Actions return `{ error: string }` on failure, `{ success: true, data }` on success
- SQL migrations are loose `.sql` files at repo root — run manually against Supabase
