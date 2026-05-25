# 🎓 Math & English Game

An educational web app for kids to practice **math** and **English vocabulary** — built by Filípek and his dad, with a little help from some AI agents.

> The UI is in Czech 🇨🇿. The codebase is in English.

---

## Features

### ➕ Math
- **Operations**: addition, subtraction, number comparison (`<` `>` `=`), and number decomposition
- **Difficulty levels**: numbers up to 10, 20, or 100
- **Carrying toggle**: optionally exclude problems that require carrying over
- **Two modes**: Training (unlimited) and Competition (timed round)
- **Leaderboard** and **session history** per player

### 🔤 English Vocabulary
- **Listen mode** — hear a word, pick the correct spelling from 4 options
- **Spelling mode** — type the word using an on-screen keyboard
- **Picture mode** — match a word to its AI-generated illustration, or vice versa
- Word audio generated via Microsoft Edge TTS (natural-sounding voices)
- Flashcard images generated on-demand by **Gemini 2.5 Flash** (no text in image, child-friendly style)
- Leaderboard and history per player and mode

### 👤 Player Profiles
- Multiple player profiles with animal avatars
- Each player has their own progress history and leaderboard entries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database + Auth | Supabase (Postgres + Row-Level Security) |
| Storage | Supabase Storage (audio files, images) |
| AI image generation | Google Gemini API (`gemini-2.5-flash-image`) |
| Text-to-speech | `msedge-tts` (Microsoft Edge Neural TTS) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Gemini API](https://aistudio.google.com) key

### 1. Clone and install

```bash
git clone https://github.com/jankovskyp/math-first-grade.git
cd math-game
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Set up the database

Run the SQL migration files against your Supabase project (in this order):

```
schema_update.sql
session_history_migration.sql
rls_migration.sql
```

You can run them in the Supabase Dashboard → SQL Editor.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Project Structure

```
src/
├── app/
│   ├── actions/        # Server Actions (DB writes, AI calls, TTS)
│   ├── api/            # API Routes
│   ├── math/           # Math game page
│   ├── english/        # English game page
│   ├── settings/       # Vocabulary management (admin)
│   └── ...
├── components/
│   ├── math/           # Math game UI
│   ├── english/        # English game UI
│   └── shared/         # Shared components (header, auth guard, etc.)
├── context/            # React context (active player)
├── lib/                # Core logic (math-logic, english-logic, supabase client)
└── types/              # TypeScript interfaces
```

---

## Security

All API keys and service credentials are server-side only — they never reach the browser:
- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are only used in Server Actions and API Routes
- The browser Supabase client uses only the public anon key, constrained by Row-Level Security policies
- `.env.local` is gitignored; `.env.example` contains only placeholder values

---

## About

This app was built as a fun learning project by **Filípek** and his **dad**. The goal: a stress-free place where kids can practice math and English at their own pace.

Feedback welcome at [gritty-claps8g@icloud.com](mailto:gritty-claps8g@icloud.com).

---

## License

MIT
