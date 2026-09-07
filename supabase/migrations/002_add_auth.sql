-- ==========================================
-- 002: Add authentication ownership to lobbies
-- ==========================================
-- Adds created_by to lobbies so each lobby has an owning user.
-- FK references auth.users (managed by Supabase Auth).
-- ON DELETE SET NULL: if a user deletes their account, their lobbies
-- remain but become unowned (not deleted), preserving history for
-- other participants.
-- ==========================================

ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS created_by UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- Index for fast lookup of "lobbies owned by user X" (used in F9 "My Lobbies").
CREATE INDEX IF NOT EXISTS idx_lobbies_created_by
  ON public.lobbies(created_by);
