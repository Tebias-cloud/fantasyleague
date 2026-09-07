-- ==========================================
-- 003: Schema integrity fixes (F3)
-- ==========================================
-- 1. Add profile_icon_id column to players (exists in code/types, missing in DB).
-- 2. Add performance indices for common query patterns.
-- 3. Add CHECK constraint: lobbies.start_date < lobbies.end_date.
--
-- POSPUESTO (no incluido):
--   - player_snapshots.lobby_id (requiere refactor del modelo de snapshots)
--   - Soft delete (requiere análisis de impacto en queries existentes)
-- ==========================================

-- 1. Add profile_icon_id to players
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS profile_icon_id INTEGER;

-- 2. Performance indices
-- Snapshots se consultan con WHERE player_puuid = ? ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_snapshots_puuid_created
  ON public.player_snapshots(player_puuid, created_at);

-- lobby_players se consulta por player_puuid (buscar "en qué lobbies está X")
CREATE INDEX IF NOT EXISTS idx_lobby_players_puuid
  ON public.lobby_players(player_puuid);

-- 3. Date integrity constraint
ALTER TABLE public.lobbies
  ADD CONSTRAINT chk_lobbies_dates CHECK (start_date < end_date);
