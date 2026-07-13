# IdeaFlow

**The Startup Execution Operating System** — generate ideas, discuss, vote, approve,
and execute, from concept to launch, without leaving the platform.

This repo is a working Next.js prototype of the product described in `PRD.md`.

## Features in this build

- **Dashboard** — stats + live activity feed
- **Ideas** — create, vote (75% approval rule), discuss, AI Co-Founder analysis
- **Workspaces** — auto-created on approval: Kanban task board (drag & drop),
  team chat, document library, milestone tracker
- **Analytics** — member activity, idea status mix, task completion charts
- **Global search + notifications**
- **Light / dark theme toggle**
- **AI Co-Founder** — real Claude API call (market analysis, competitors, revenue
  ideas, tech stack, risks, roadmap), proxied through a server route so your API
  key is never exposed to the browser

> Note: data is in-memory (seeded on load) — there is no database wired up yet.
> See "Next steps" below for what a production backend would need.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Add your environment variables
cp .env.example .env.local
# then edit .env.local — see "Backend setup" below for Supabase, and
# paste your Claude key from https://console.anthropic.com/

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend setup (Supabase)

This repo now includes a real database layer. To wire it up:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor in your Supabase dashboard and run the contents of
   `supabase/schema.sql`. This creates every table (ideas, votes, workspaces,
   tasks, documents, messages, milestones, notifications), enables Row Level
   Security with policies for each table, and sets up a Postgres trigger that
   auto-approves ideas at 75% and auto-creates their workspace — no app code
   required for that rule.
3. In your Supabase project → **Authentication → Providers**, enable Google,
   GitHub, and/or Email (magic link) sign-in.
4. Copy your project URL, anon key, and service role key from
   **Settings → API** into `.env.local`.
5. Restart `npm run dev` — `/login` will now issue real sessions, and
   `/api/ideas`, `/api/ideas/[id]/vote`, and `/api/workspaces/[id]/tasks` read
   and write to your database instead of in-memory seed data.

> The UI in `components/IdeaFlowApp.tsx` still renders from local seed state
> by default — swap its `useState(seedIdeas)` etc. for `fetch` calls to the
> routes above (or React Query/SWR) to make the whole app database-backed
> end to end.

## Project structure

```
ideaflow/
├── app/
│   ├── api/
│   │   ├── ai-cofounder/route.ts        # Claude API proxy (server-side key)
│   │   ├── ideas/route.ts               # GET (list) / POST (create) ideas
│   │   ├── ideas/[id]/vote/route.ts     # POST — cast/update a vote
│   │   └── workspaces/[id]/tasks/route.ts  # GET/POST/PATCH — Kanban tasks
│   ├── auth/callback/route.ts           # OAuth + magic-link session exchange
│   ├── login/page.tsx                   # Google / GitHub / Email sign-in
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── IdeaFlowApp.tsx                  # the entire app UI (client component)
├── lib/supabase/
│   ├── client.ts                        # browser Supabase client
│   ├── server.ts                        # server Supabase client (+ service role)
│   └── types.ts                         # hand-written DB types
├── middleware.ts                        # refreshes the auth session cookie
├── supabase/schema.sql                  # full DB schema, RLS policies, triggers
├── PRD.md                               # full product requirements doc
├── .env.example
└── package.json
```

## Pushing this to GitHub

```bash
git init
git add .
git commit -m "Initial commit — IdeaFlow prototype"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env.local` is already excluded via `.gitignore`, so your API key won't be
committed.

## Deploying

The easiest path is [Vercel](https://vercel.com/new) — import the GitHub repo,
add `ANTHROPIC_API_KEY` under Project Settings → Environment Variables, and
deploy.

## Next steps (to go from prototype to production)

- **Wire the UI to the database** — `components/IdeaFlowApp.tsx` currently
  renders from local seed state; point it at `/api/ideas`,
  `/api/ideas/[id]/vote`, and `/api/workspaces/[id]/tasks` (already built,
  see "Backend setup" above)
- **Real-time**: subscribe to Supabase Realtime channels on `messages` and
  `tasks` so multiple users see live updates
- **File storage**: the `documents` storage bucket + RLS policies are already
  in `supabase/schema.sql` — add an upload handler using
  `supabase.storage.from('documents').upload(...)`
- **Workspace membership UI**: an invite flow that inserts into
  `workspace_members` (table + policies already exist)
- **Notifications**: the `notifications` table exists — add a route that
  fans out a row to every workspace member on key events (idea approved,
  task assigned, etc.)

## Tech stack

Next.js 14 (App Router) · TypeScript · React 18 · Recharts · Lucide Icons ·
Claude API (`claude-sonnet-4-6`)
