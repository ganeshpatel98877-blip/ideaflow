-- ============================================================================
-- Migration: enable Realtime on the messages table
--
-- Needed for the new WhatsApp-style live workspace chat. Without this,
-- postgres_changes subscriptions on `messages` never fire — messages will
-- still save fine, but other members won't see them appear live (only on
-- refresh).
--
-- Run this once in the Supabase SQL editor. Safe to run even if it's
-- already added — Postgres will just error harmlessly if so, in which case
-- you can ignore it.
-- ============================================================================

alter publication supabase_realtime add table messages;
