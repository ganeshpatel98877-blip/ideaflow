-- ============================================================================
-- Migration: enable Realtime on the messages and tasks tables
--
-- Needed for the new WhatsApp-style live workspace chat, and the live
-- Kanban board. Without this, postgres_changes subscriptions never fire —
-- data still saves fine, but other members won't see it appear live (only
-- on refresh).
--
-- Run this once in the Supabase SQL editor. Safe to run even if it's
-- already added — Postgres will just error harmlessly if so, in which case
-- you can ignore it.
-- ============================================================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table notifications;
