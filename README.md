<div align="center">

# 🚀 IdeaFlow

### The Startup Execution Operating System

**Generate ideas → discuss → vote → get approved → execute — all in one platform, without ever switching tools.**

[![Live Demo](https://img.shields.io/badge/demo-live-3AC98C?style=for-the-badge)](https://ideaflow-liard-delta.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Realtime-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/AI-Groq%20(Llama%203.3)-F55036?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

[**🔗 Live Demo**](https://ideaflow-liard-delta.vercel.app) · [Report a Bug](../../issues) · [Full Product Spec](PRD.md)

</div>

---

## What is IdeaFlow?

Most teams juggle Notion for docs, Trello for tasks, Slack for chat, and a
spreadsheet for voting on what to build next. **IdeaFlow replaces all of it**
with one connected loop:

```
Idea → Discussion → Voting → 75% Approval → Auto-Created Workspace → Execution → Launch
```

The moment an idea crosses 75% team approval, IdeaFlow automatically spins up
a dedicated workspace — Kanban board, live chat, document library, and
milestone tracker — with the idea's creator as Owner and every approving
voter added as a member. No manual setup, no copy-pasting into a new tool.

## ✨ Features

| | |
|---|---|
| 💡 **Ideas** | Structured submission, threaded discussion with @mentions, live voting |
| 🗳️ **Voting** | Approve / Reject / Neutral — 75% approval auto-unlocks a workspace (enforced by a DB trigger, not app code) |
| 📋 **Kanban Board** | Drag-and-drop task management, **real-time** sync across every team member |
| 💬 **Team Chat** | WhatsApp-style bubbles, **real-time**, @mentions with autocomplete |
| 📁 **Documents** | Real file uploads/downloads via Supabase Storage, organized by folder |
| 🏁 **Milestones** | Idea Approved → MVP → Beta → First Customer → Funding → Launch — click to mark complete, notifies the whole team |
| 🤖 **AI Co-Founder** | On-demand market analysis, competitor research, tech stack, risks, and roadmap — powered by Groq (Llama 3.3 70B), free tier |
| 👑 **Admin Panel** | Manage team roles, send email invites, view all workspaces |
| 🔔 **Notifications** | Real-time alerts for approvals, comments, mentions, task assignments, milestones |
| 📊 **Analytics** | Member activity, idea status mix, task completion — all live charts |
| 🔍 **Global Search** | Cross-searches ideas, tasks, and documents from anywhere |
| 🌗 **Light / Dark Mode** | Full theme support across the entire app |
| 🔐 **Auth** | Google, GitHub, or email one-time code — no passwords |

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router) · React 18
- **Backend:** Next.js Route Handlers
- **Database / Auth / Realtime / Storage:** [Supabase](https://supabase.com) (Postgres + Row Level Security)
- **AI:** [Groq](https://groq.com) — Llama 3.3 70B, genuinely free tier
- **Charts:** Recharts · **Icons:** Lucide

## 📸 Screenshots

> _Add screenshots or a short demo GIF here — a picture of the Dashboard,
> Kanban board, and AI Co-Founder panel goes a long way for anyone
> evaluating the repo._

## 🚀 Quick Start

```bash
git clone https://github.com/ganeshpatel98877-blip/ideaflow.git
cd ideaflow
npm install
cp .env.example .env.local   # then fill in the values — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) — free, no card required |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API (publishable/anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (secret key — needed for Admin Panel invites/role changes) |

## 🗄️ Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`. This creates every
   table, enables Row Level Security, and sets up the Postgres trigger that
   auto-approves ideas at 75% and provisions their workspace.
3. Copy your project's URL + keys into `.env.local` (see table above).
4. `/login` works immediately via **email one-time code** — no extra setup.
   Google/GitHub sign-in are optional, see below.
5. Make yourself an Owner (required for `/admin`):
   ```sql
   update profiles set role = 'owner' where id =
     (select id from auth.users where email = 'you@example.com');
   ```

> **Upgrading an existing project?** Run the files in `supabase/migrations/`
> once each, in order (002 → 004). They're safe, additive fixes — see the
> comments in each file for what they do.

<details>
<summary><strong>Optional: enable Google / GitHub sign-in</strong></summary>

**Google:**
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID** → Web application.
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the Client ID + Secret into Supabase → Authentication → Providers → Google → Save.

**GitHub:**
1. [GitHub → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/developers)
2. Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the Client ID + Secret into Supabase → Authentication → Providers → GitHub → Save.

No code changes needed — the buttons in `app/login/page.tsx` start working immediately.
</details>

## 📁 Project Structure

```
ideaflow/
├── app/
│   ├── admin/page.tsx                     # Admin Panel (Owners/Admins only)
│   ├── api/
│   │   ├── admin/{invite,role}/route.ts   # Team management
│   │   ├── ai-cofounder/route.ts          # Groq API proxy (server-side key)
│   │   ├── ideas/...                      # Ideas, votes, comments, workspace lookup
│   │   └── workspaces/[id]/{tasks,messages,milestones}/route.ts
│   ├── auth/callback/route.ts             # OAuth + OTP session exchange
│   ├── login/page.tsx                     # Google / GitHub / Email sign-in
│   └── page.tsx                           # Main app entry
├── components/
│   ├── IdeaFlowApp.jsx                    # The entire app UI
│   └── AdminPanel.jsx                     # Admin Panel UI
├── lib/
│   ├── supabase/{client,server,types}.ts  # Supabase client setup
│   └── mentions.ts                        # @mention detection + notifications
├── middleware.ts                          # Auth session refresh
├── supabase/
│   ├── schema.sql                         # Full DB schema, RLS, triggers
│   └── migrations/                        # Incremental upgrades
├── PRD.md                                 # Full product requirements doc
└── .env.example
```

## ☁️ Deploying

Easiest path is [Vercel](https://vercel.com/new):

1. Import this repo
2. Add the 4 environment variables (see table above) under Project Settings
3. Deploy

If using Google/GitHub OAuth, add your production URL as an authorized
redirect in both the provider console and Supabase → Authentication → URL
Configuration.

## 🗺️ Roadmap

Everything in the original [product spec](PRD.md) is implemented. From here,
it's refinement:

- [ ] Regenerate real Supabase types (`npx supabase gen types typescript`) to restore strict TypeScript checking
- [ ] Startup/Idea Marketplace, Investor Portal (see PRD § Future Roadmap)
- [ ] AI Pitch Deck / Business Plan generator

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built with [Claude](https://claude.ai)

</div>
