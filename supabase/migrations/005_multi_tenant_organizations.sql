-- ============================================================================
-- Migration: multi-tenant Organizations (companies)
--
-- Until now, every signed-up user shared one global pool of ideas/profiles —
-- fine for a single team, but wrong once multiple companies use the same
-- deployment. This migration adds an `organizations` table and scopes
-- profiles + ideas to one, so each company's data is fully isolated.
--
-- Behavior after this migration:
--   - A brand-new user who signs up directly (not via an invite link)
--     automatically becomes the Owner of a new organization named
--     "<their name>'s Company".
--   - A user who signs up via an Admin Panel invite joins that inviter's
--     organization instead, with the role the inviter chose.
--   - Ideas, and everything hanging off them (workspaces, tasks, chat,
--     documents, milestones), are scoped to the creator's organization.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organizations table
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

drop policy if exists "org members can view their organization" on organizations;
create policy "org members can view their organization"
  on organizations for select using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.organization_id = organizations.id)
  );

-- ---------------------------------------------------------------------------
-- 2. Add organization_id to profiles and ideas
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists organization_id uuid references organizations(id);
alter table ideas add column if not exists organization_id uuid references organizations(id);

-- ---------------------------------------------------------------------------
-- 3. Backfill: put ALL existing users + ideas into one organization, so
--    nothing already in the database becomes orphaned/invisible.
-- ---------------------------------------------------------------------------
do $$
declare
  default_org_id uuid;
  first_owner_id uuid;
begin
  if not exists (select 1 from organizations) then
    select id into first_owner_id from profiles where role = 'owner' order by created_at asc limit 1;
    if first_owner_id is null then
      select id into first_owner_id from profiles order by created_at asc limit 1;
    end if;

    insert into organizations (name, created_by)
    values ('My Company', first_owner_id)
    returning id into default_org_id;

    update profiles set organization_id = default_org_id where organization_id is null;
    update ideas set organization_id = default_org_id where organization_id is null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Update the new-user trigger: create a new org for direct sign-ups,
--    or join the inviter's org if this was an Admin Panel invite.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invited_org_id uuid;
  invited_role user_role;
  new_org_id uuid;
begin
  invited_org_id := (new.raw_user_meta_data->>'organization_id')::uuid;
  invited_role := (new.raw_user_meta_data->>'invited_role')::user_role;

  if invited_org_id is not null then
    -- Joined via an Admin Panel invite — attach to that organization.
    insert into public.profiles (id, full_name, avatar_url, organization_id, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'avatar_url',
      invited_org_id,
      coalesce(invited_role, 'member')
    );
  else
    -- Direct sign-up — this person is starting their own company.
    insert into organizations (name, created_by)
    values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Company', new.id)
    returning id into new_org_id;

    insert into public.profiles (id, full_name, avatar_url, organization_id, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'avatar_url',
      new_org_id,
      'owner'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- 5. Scope RLS to the organization
-- ---------------------------------------------------------------------------

-- Profiles: only see people in your own organization (was: everyone).
drop policy if exists "profiles are viewable by authenticated users" on profiles;
create policy "profiles are viewable within your organization"
  on profiles for select using (
    organization_id = (select organization_id from profiles where id = auth.uid())
  );

-- Fix a gap from before multi-tenancy existed: this old policy let any
-- Owner/Admin update ANY profile, including ones in a different
-- organization. Replace it with one scoped to the same organization.
drop policy if exists "owners and admins can update any profile" on profiles;
create policy "owners and admins can update profiles in their organization"
  on profiles for update using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('owner', 'admin')
      and p.organization_id = profiles.organization_id
    )
  );

-- Ideas: only see/create ideas within your own organization (was: everyone).
drop policy if exists "ideas are viewable by authenticated users" on ideas;
create policy "ideas are viewable within your organization"
  on ideas for select using (
    organization_id = (select organization_id from profiles where id = auth.uid())
  );

drop policy if exists "authenticated users can create ideas" on ideas;
create policy "users can create ideas in their own organization"
  on ideas for insert with check (
    auth.uid() = created_by
    and organization_id = (select organization_id from profiles where id = auth.uid())
  );

-- Votes: scoped to the same organization as the idea being voted on.
drop policy if exists "votes are viewable by authenticated users" on idea_votes;
create policy "votes are viewable within your organization"
  on idea_votes for select using (
    exists (
      select 1 from ideas
      join profiles on profiles.id = auth.uid()
      where ideas.id = idea_votes.idea_id
      and ideas.organization_id = profiles.organization_id
    )
  );
drop policy if exists "users can cast their own vote" on idea_votes;
create policy "users can cast their own vote"
  on idea_votes for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from ideas
      join profiles on profiles.id = auth.uid()
      where ideas.id = idea_votes.idea_id
      and ideas.organization_id = profiles.organization_id
    )
  );

-- Comments: scoped to the same organization as the idea being discussed.
drop policy if exists "comments are viewable by authenticated users" on idea_comments;
create policy "comments are viewable within your organization"
  on idea_comments for select using (
    exists (
      select 1 from ideas
      join profiles on profiles.id = auth.uid()
      where ideas.id = idea_comments.idea_id
      and ideas.organization_id = profiles.organization_id
    )
  );
drop policy if exists "authenticated users can comment" on idea_comments;
create policy "authenticated users can comment"
  on idea_comments for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from ideas
      join profiles on profiles.id = auth.uid()
      where ideas.id = idea_comments.idea_id
      and ideas.organization_id = profiles.organization_id
    )
  );

-- Fix another pre-multi-tenancy gap: any Owner/Admin (of ANY organization)
-- could see ANY workspace via this policy's second clause. Scope it to
-- their own organization's workspaces only.
drop policy if exists "workspace visible to its members" on workspaces;
create policy "workspace visible to its members"
  on workspaces for select using (
    exists (select 1 from workspace_members where workspace_id = id and user_id = auth.uid())
    or exists (
      select 1 from profiles p
      join ideas i on i.id = workspaces.idea_id
      where p.id = auth.uid() and p.role in ('owner', 'admin') and p.organization_id = i.organization_id
    )
  );
