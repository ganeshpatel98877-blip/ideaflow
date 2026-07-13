# IdeaFlow — Product Requirements Document

**The Startup Execution Operating System**
Version 1.0 · July 2026

## 1. Product Vision

IdeaFlow is a complete Startup Execution Operating System — a single platform
where teams generate ideas, discuss and vote on them, convert approved ideas
into fully structured workspaces, and execute from concept through to public
launch.

The objective is to replace the typical startup tool stack — Notion, Trello,
Jira, Slack, Google Docs and Discord — with one unified, professional-grade
platform purpose-built for founding teams.

## 2. User Roles & Permissions

| Role | Permissions |
|---|---|
| Owner | Full platform access, create/delete workspaces, invite members, change roles, approve ideas |
| Admin | Manage workspace, assign tasks, manage documents, moderate discussions |
| Member | Create ideas, vote, discuss, work on assigned tasks |
| Viewer | Read-only access, no editing rights |

## 3. Core Workflow

1. Idea is created by a team member
2. Team discusses the idea in a threaded discussion area
3. Voting opens to the workspace
4. If approval ≥ 75%, status changes to **Approved**
5. A dedicated execution workspace is auto-generated
6. Team begins execution: tasks, docs, discussions, milestones
7. Startup progresses from idea to launch, fully tracked

## 4. Voting System

Approval percentage = `(Approved Votes ÷ Total Votes) × 100`

- Below 75% → status remains **Discussion**
- 75% or above → status becomes **Approved** and unlocks workspace creation

## 5. Dashboard

**Statistics**: Total Ideas · Approved Ideas · Rejected Ideas · Active
Workspaces · Team Members · Tasks Completed · Pending Tasks

**Activity Feed**: a live, chronological feed of platform events — idea
creation, votes, workspace creation, task completion, document uploads.

## 6. Idea Management

- **Create Idea** — Title, Problem Statement, Detailed Description, Solution,
  Target Audience, Business Model, Market Size, Competitors, Technology
  Required, Estimated Cost, Category, Tags, Priority, Attachments
- **Ideas Directory** — searchable, filterable, sortable grid of idea cards
- **Idea Detail Page** — overview, problem, solution, market analysis,
  competitors, business model, discussion thread, voting controls, comment /
  reply / mention / share / bookmark

## 7. Workspace System

Every approved idea automatically provisions an execution workspace
containing:

- **Task Management** — Kanban board: To Do, In Progress, Review, Completed
- **Team Management** — invite, assign roles, track contribution and activity
- **Discussion System** — real-time chat, threads, mentions, pinned messages
- **Document System** — uploads, version history, comments, folder structure
- **Milestones** — structured progress tracking

## 8. Auto-Organization

On workspace creation, IdeaFlow auto-generates a standard folder structure:
Ideas, Tasks, Documents, Discussions, Research, Design, Development,
Marketing, Finance, Milestones.

## 9. Milestone Tracking

| Stage | Milestone | Signal |
|---|---|---|
| 1 | Idea Approved | Vote reaches ≥ 75% approval |
| 2 | MVP Completed | Core workspace tasks closed |
| 3 | Beta Released | First external users onboarded |
| 4 | First Customer | First paid conversion |
| 5 | Funding Raised | Capital secured |
| 6 | Public Launch | Product live for all users |

## 10. AI Co-Founder

Every idea and workspace is backed by an AI advisor, powered by the Claude
API, that produces: market/competitor analysis, business model & revenue
suggestions, technical stack recommendations, risk analysis, execution
roadmap, growth/marketing plans, launch checklist and funding suggestions —
generated in real time from the idea's own problem statement.

## 11. Search & Notifications

A single global search spans ideas, tasks, documents, members, messages and
workspaces. Users are notified on: new ideas, votes, approvals, task
assignment/completion, document uploads, member additions, mentions.

## 12. Analytics

Most active members · most-voted ideas · workspace progress · task
completion rate · team productivity · startup growth metrics.

## 13. Design Direction

Visual language draws from Linear, Notion, ClickUp, Vercel, Jira, Slack and
Product Hunt. Sidebar + top navigation, full responsiveness, dark and light
modes, purposeful motion, data visualization, premium typography.

## 14. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Next.js API Routes |
| Database | PostgreSQL via Supabase |
| Authentication | Google OAuth, GitHub OAuth, Email/Password |
| File Storage | Supabase Storage |
| Real-Time | WebSockets (Supabase Realtime) |
| AI Layer | Google Gemini API |

## 15. Future Roadmap

Startup Marketplace & Idea Marketplace · Investor Portal & Fundraising
Tracking · AI Pitch Deck & Business Plan Generator · Startup CRM · Hiring
System & Team Matching · Founder Network, Public Startup Profiles &
Leaderboards.

## 16. Final Goal

IdeaFlow becomes the operating system for building startups — taking a team
from **Idea → Discussion → Voting → Approval → Workspace → Execution →
Launch** without ever leaving the platform.
