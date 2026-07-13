-- ============================================================================
-- Migration: fix auto-created workspaces having no members
--
-- The original trigger created a workspace on 75% approval but never added
-- anyone to workspace_members — so under RLS, nobody (besides an owner/admin
-- role) could actually see or work in the workspace they'd just unlocked.
--
-- This migration replaces the trigger function so that, going forward, the
-- idea's creator is added as the workspace owner and every "approve" voter
-- is added as a member. Safe to run on a project that already ran
-- schema.sql — it only replaces the function, it does not touch data.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================================

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

  if new_idea_status = 'approved' then
    insert into workspaces (idea_id, name)
    select new.idea_id, title from ideas where id = new.idea_id
    on conflict (idea_id) do nothing
    returning id into new_workspace_id;

    if new_workspace_id is not null then
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

-- Backfill: add missing owner/member rows for any workspace that already
-- exists from before this fix.
insert into workspace_members (workspace_id, user_id, role)
select w.id, i.created_by, 'owner'
from workspaces w
join ideas i on i.id = w.idea_id
on conflict (workspace_id, user_id) do nothing;

insert into workspace_members (workspace_id, user_id, role)
select w.id, v.user_id, 'member'
from workspaces w
join idea_votes v on v.idea_id = w.idea_id and v.choice = 'approve'
on conflict (workspace_id, user_id) do nothing;
