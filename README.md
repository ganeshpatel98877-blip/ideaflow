# IdeaFlow

**The Startup Execution Operating System** — generate ideas, discuss, vote, approve,
and execute, from concept to launch, without leaving the platform.

This repo is a working Next.js prototype of the product described in `PRD.md`.

## Features in this build

- **Dashboard** — stats + live activity feed
- **Ideas** — create, vote (75% approval rule), discuss, AI Co-Founder analysis
- **Workspaces** — auto-created on approval: Kanban task board (drag & drop),
  real-time WhatsApp-style team chat, document library (real Supabase
  Storage uploads/downloads), milestone tracker
- **Admin Panel** (`/admin`, Owners/Admins only) — view all team members,
  change roles, invite new teammates by email, see all workspaces
- **Analytics** — member activity, idea status mix, task completion charts
- **Global search + notifications**
- **Light / dark theme toggle**
- **AI Co-Founder** — real Gemini API call (market analysis, competitors, revenue
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
# paste your Gemini key from https://aistudio.google.com/apikey

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend setup (Supabase)

This repo now includes a real database layer, wired end to end — the UI reads
and writes real data once this is set up:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor in your Supabase dashboard and run the contents of
   `supabase/schema.sql`. This creates every table (ideas, votes, workspaces,
   tasks, documents, messages, milestones, notifications), enables Row Level
   Security with policies for each table, and sets up a Postgres trigger that
   auto-approves ideas at 75% and auto-creates their workspace — no app code
   required for that rule.
3. Copy your project URL, anon key, and service role key from
   **Settings → API** into `.env.local`.
4. Run `npm install && npm run dev` — `/login` already works via **email
   magic link** with zero extra setup (Supabase enables email auth by
   default). Google and GitHub sign-in are optional; see below if you want
   them too.
5. Once signed in, `/api/ideas`, `/api/ideas/[id]/vote`,
   `/api/ideas/[id]/comments`, `/api/ideas/[id]/workspace`,
   `/api/workspaces/[id]/tasks`, and `/api/workspaces/[id]/messages` all read
   and write your real database — ideas, votes, comments, tasks, and chat
   messages persist and are shared across everyone signed into the project.

### Optional: enable Google / GitHub sign-in

**Google:**
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID** → Application type: **Web application**.
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (find your project ref in the Supabase project URL).
3. Copy the **Client ID** and **Client Secret**.
4. In Supabase: **Authentication → Providers → Google** → paste both, toggle it on, Save.

**GitHub:**
1. [GitHub → Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/developers).
2. Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. Copy the **Client ID** and generate a **Client Secret**.
4. In Supabase: **Authentication → Providers → GitHub** → paste both, toggle it on, Save.

That's it — the buttons in `app/login/page.tsx` will start working immediately, no code changes needed.

### Admin Panel access

Every new sign-up gets `role = 'member'` by default (see the
`handle_new_user` trigger in `schema.sql`). To access `/admin`, make your own
account an Owner once, directly in the SQL editor:

```sql
update profiles set role = 'owner' where id =
  (select id from auth.users where email = 'you@example.com');
```

After that, use the Admin Panel itself to promote/invite everyone else —
Owners and Admins can change any member's role and send email invites from
there. Invites and role changes both require `SUPABASE_SERVICE_ROLE_KEY` to
be set in `.env.local`.

> **Already ran `schema.sql` before this update?** Run the files in
> `supabase/migrations/` (002, 003, 004) once each in the SQL editor, in
> order. They fix a workspace-membership bug, add an Admin Panel permission
> policy, and enable Realtime for live chat — all safe, additive changes.

> The UI in `components/IdeaFlowApp.jsx` still falls back to local seed state
> when it receives no real ideas from the database (e.g. on first run before
> anyone has created one) — so the app is never blank, and switches to fully
> live data automatically once real rows exist.
> by default — swap its `useState(seedIdeas)` etc. for `fetch` calls to the
> routes above (or React Query/SWR) to make the whole app database-backed
> end to end.

## Project structure

```
ideaflow/
├── app/
│   ├── admin/page.tsx                   # Admin Panel (Owners/Admins only)
│   ├── api/
│   │   ├── admin/invite/route.ts        # POST — invite a teammate by email
│   │   ├── admin/role/route.ts          # POST — change a member's role
│   │   ├── ai-cofounder/route.ts        # Gemini API proxy (server-side key)
│   │   ├── ideas/route.ts               # GET (list) / POST (create) ideas
│   │   ├── ideas/[id]/vote/route.ts     # POST — cast/update a vote
│   │   ├── ideas/[id]/comments/route.ts # GET/POST — idea discussion
│   │   ├── ideas/[id]/workspace/route.ts # GET — a workspace + its data
│   │   ├── workspaces/[id]/tasks/route.ts    # GET/POST/PATCH — Kanban tasks
│   │   └── workspaces/[id]/messages/route.ts # GET/POST — team chat
│   ├── auth/callback/route.ts           # OAuth + magic-link session exchange
│   ├── login/page.tsx                   # Google / GitHub / Email sign-in
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── IdeaFlowApp.jsx                  # the main app UI (client component)
│   └── AdminPanel.jsx                   # the Admin Panel UI (client component)
├── lib/supabase/
│   ├── client.ts                        # browser Supabase client
│   ├── server.ts                        # server Supabase client (+ service role)
│   └── types.ts                         # hand-written DB types
├── middleware.ts                        # refreshes the auth session cookie
├── supabase/
│   ├── schema.sql                       # full DB schema, RLS policies, triggers
│   └── migrations/                      # incremental fixes, see below
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
add `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` under Project Settings → Environment
Variables, and deploy. If you set up Google/GitHub OAuth, also add your
production URL as an authorized redirect in both the provider console and
Supabase → Authentication → URL Configuration.

## Next steps (to go from prototype to production)

The UI is now fully wired to Supabase — ideas, votes, comments, workspace
tasks, workspace chat, and document uploads all read and write real data
(with the offline seed demo as a fallback when the database is empty).
Workspace chat and the Kanban board are both real-time (Supabase Realtime),
real notifications fire on idea approval / comments / task assignment, and
there's a working Admin Panel for team management. What's left:

- **Mentions**: the PRD calls out "@mention" support in comments/chat — not
  wired up yet
- **Notification fan-out**: notifications currently target one person per
  event (idea creator, task assignee). Extend to notify *all* workspace
  members on major events (e.g. milestone completed) if you want that.

## Tech stack

Next.js 14 (App Router) · TypeScript · React 18 · Recharts · Lucide Icons ·
Gemini API (`gemini-2.5-flash`)
