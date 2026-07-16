-- ============================================================================
-- Migration: allow Owners/Admins to update any profile (role management)
--
-- Needed for the Admin Panel's role-change feature. The app's API route
-- already uses the service-role key for this (bypassing RLS), so this
-- policy is defense-in-depth / consistency with a fresh schema.sql install
-- rather than strictly required — but run it if you want the same
-- permission model enforced at the database level too.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================================

drop policy if exists "owners and admins can update any profile" on profiles;
create policy "owners and admins can update any profile"
  on profiles for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('owner', 'admin'))
  );
