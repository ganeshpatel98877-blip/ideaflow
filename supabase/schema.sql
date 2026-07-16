-- ============================================================================
-- IdeaFlow — Database Schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('owner', 'admin', 'member', 'viewer');
create type idea_status as enum ('discussion', 'approved', 'rejected');
create type vote_choice as enum ('approve', 'reject', 'neutral');
create type task_status as enum ('todo', 'in_progress', 'review', 'completed');
create type task_priority as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- Profiles (one row per authenticated user, mirrors auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ideas
-- ---------------------------------------------------------------------------
create table ideas (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  problem text,
  description text,
  solution text,
  target_audience text,
  business_model text,
  market_size text,
  competitors text,
  technology_required text,
  estimated_cost text,
  category text not null default 'General',
  tags text[] default '{}',
  priority text default 'Medium',
  status idea_status not null default 'discussion',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table idea_votes (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid not null references ideas (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  choice vote_choice not null,
  created_at timestamptz not null default now(),
  unique (idea_id, user_id) -- one vote per user per idea
);

create table idea_comments (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid not null references ideas (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  parent_id uuid references idea_comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workspaces (auto-created when an idea is approved)
-- ---------------------------------------------------------------------------
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid not null unique references ideas (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role user_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references profiles (id),
  priority task_priority not null default 'medium',
  status task_status not null default 'todo',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  folder text not null default 'Research',
  storage_path text not null, -- path inside the Supabase Storage bucket
  size_bytes bigint,
  version int not null default 1,
  uploaded_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table milestones (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null, -- 'idea_created' | 'vote_added' | 'idea_approved' | 'task_assigned' | ...
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_idea_votes_idea on idea_votes (idea_id);
create index idx_idea_comments_idea on idea_comments (idea_id);
create index idx_tasks_workspace on tasks (workspace_id);
create index idx_messages_workspace on messages (workspace_id);
create index idx_documents_workspace on documents (workspace_id);
create index idx_notifications_user on notifications (user_id, read);

-- ---------------------------------------------------------------------------
-- Helper: approval percentage + auto-approve trigger (75% rule)
-- ---------------------------------------------------------------------------
create or replace function public.check_idea_approval()
returns trigger as $$
declare
  approve_count int;
  total_count int;
  pct numeric;
  new_idea_status idea_status;
  new_workspace_id uuid;
begin
  select
    count(*) filter (where choice = 'approve'),
    count(*)
  into approve_count, total_count
  from idea_votes
  where idea_id = new.idea_id;

  if total_count = 0 then
    return new;
  end if;

  pct := (approve_count::numeric / total_count::numeric) * 100;

  if pct >= 75 then
    new_idea_status := 'approved';
  else
    new_idea_status := 'discussion';
  end if;

  update ideas set status = new_idea_status, updated_at = now()
  where id = new.idea_id and status != new_idea_status;

  -- Auto-create a workspace the first time an idea crosses 75%
  if new_idea_status = 'approved' then
    insert into workspaces (idea_id, name)
    select new.idea_id, title from ideas where id = new.idea_id
    on conflict (idea_id) do nothing
    returning id into new_workspace_id;

    if new_workspace_id is not null then
      -- Add the idea's creator as the workspace owner, and everyone who
      -- voted "approve" as a member — otherwise nobody could see or work
      -- in the workspace they just created (RLS restricts workspace
      -- access to workspace_members).
      insert into workspace_members (workspace_id, user_id, role)
      select new_workspace_id, created_by, 'owner' from ideas where id = new.idea_id
      on conflict (workspace_id, user_id) do nothing;

      insert into workspace_members (workspace_id, user_id, role)
      select new_workspace_id, user_id, 'member'
      from idea_votes
      where idea_id = new.idea_id and choice = 'approve'
      on conflict (workspace_id, user_id) do nothing;

      insert into milestones (workspace_id, name, sort_order, completed, completed_at)
      values
        (new_workspace_id, 'Idea Approved', 1, true, now()),
        (new_workspace_id, 'MVP Completed', 2, false, null),
        (new_workspace_id, 'Beta Released', 3, false, null),
        (new_workspace_id, 'First Customer', 4, false, null),
        (new_workspace_id, 'Funding Raised', 5, false, null),
        (new_workspace_id, 'Public Launch', 6, false, null);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_idea_vote_cast
  after insert or update on idea_votes
  for each row execute procedure public.check_idea_approval();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table ideas enable row level security;
alter table idea_votes enable row level security;
alter table idea_comments enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table tasks enable row level security;
alter table documents enable row level security;
alter table messages enable row level security;
alter table milestones enable row level security;
alter table notifications enable row level security;

-- Profiles: everyone signed in can read profiles; users can only edit their own
create policy "profiles are viewable by authenticated users"
  on profiles for select using (auth.role() = 'authenticated');
create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "owners and admins can update any profile"
  on profiles for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('owner', 'admin'))
  );

-- Ideas: any authenticated user can read/create; only the creator or an admin/owner can edit
create policy "ideas are viewable by authenticated users"
  on ideas for select using (auth.role() = 'authenticated');
create policy "authenticated users can create ideas"
  on ideas for insert with check (auth.uid() = created_by);
create policy "creator or admin can update idea"
  on ideas for update using (
    auth.uid() = created_by
    or exists (select 1 from profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- Votes: one vote per user, visible to all, only own vote editable
create policy "votes are viewable by authenticated users"
  on idea_votes for select using (auth.role() = 'authenticated');
create policy "users can cast their own vote"
  on idea_votes for insert with check (auth.uid() = user_id);
create policy "users can change their own vote"
  on idea_votes for update using (auth.uid() = user_id);

-- Comments
create policy "comments are viewable by authenticated users"
  on idea_comments for select using (auth.role() = 'authenticated');
create policy "authenticated users can comment"
  on idea_comments for insert with check (auth.uid() = user_id);

-- Workspaces + nested resources: restricted to workspace members
create policy "workspace visible to its members"
  on workspaces for select using (
    exists (select 1 from workspace_members where workspace_id = id and user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

create policy "workspace_members visible to workspace members"
  on workspace_members for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()
    )
  );

create policy "tasks visible to workspace members"
  on tasks for select using (
    exists (select 1 from workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
  );
create policy "workspace members can manage tasks"
  on tasks for all using (
    exists (select 1 from workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
  );

create policy "documents visible to workspace members"
  on documents for select using (
    exists (select 1 from workspace_members where workspace_id = documents.workspace_id and user_id = auth.uid())
  );
create policy "workspace members can upload documents"
  on documents for insert with check (
    exists (select 1 from workspace_members where workspace_id = documents.workspace_id and user_id = auth.uid())
  );

create policy "messages visible to workspace members"
  on messages for select using (
    exists (select 1 from workspace_members where workspace_id = messages.workspace_id and user_id = auth.uid())
  );
create policy "workspace members can post messages"
  on messages for insert with check (
    auth.uid() = user_id
    and exists (select 1 from workspace_members where workspace_id = messages.workspace_id and user_id = auth.uid())
  );

create policy "milestones visible to workspace members"
  on milestones for select using (
    exists (select 1 from workspace_members where workspace_id = milestones.workspace_id and user_id = auth.uid())
  );

-- Notifications: users only see their own
create policy "users see their own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "users can mark their own notifications read"
  on notifications for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime — required for the live workspace chat to receive new messages
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table messages;

-- ---------------------------------------------------------------------------
-- Storage bucket for documents (run once)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "workspace members can read their documents bucket"
  on storage.objects for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from workspace_members wm
      where wm.user_id = auth.uid()
      and (storage.foldername(name))[1] = wm.workspace_id::text
    )
  );

create policy "workspace members can upload to their documents bucket"
  on storage.objects for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from workspace_members wm
      where wm.user_id = auth.uid()
      and (storage.foldername(name))[1] = wm.workspace_id::text
    )
  );
