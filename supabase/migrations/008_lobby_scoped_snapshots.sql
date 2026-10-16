-- 008: Immutable, per-lobby SoloQ snapshots. Required for independent competitions.
BEGIN;

CREATE TABLE IF NOT EXISTS public.lobby_player_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lobby_id UUID NOT NULL,
  player_puuid TEXT NOT NULL,
  tier TEXT NOT NULL,
  division TEXT NOT NULL,
  lp INTEGER NOT NULL CHECK (lp >= 0),
  total_wins INTEGER NOT NULL CHECK (total_wins >= 0),
  total_losses INTEGER NOT NULL CHECK (total_losses >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_lobby_snapshot_member FOREIGN KEY (lobby_id, player_puuid)
    REFERENCES public.lobby_players(lobby_id, player_puuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lobby_snapshot_by_member
  ON public.lobby_player_snapshots(lobby_id, player_puuid, created_at DESC);

ALTER TABLE public.lobby_player_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Consultar snapshots visibles" ON public.lobby_player_snapshots;
CREATE POLICY "Consultar snapshots visibles"
  ON public.lobby_player_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lobbies l
    WHERE l.id = lobby_player_snapshots.lobby_id
      AND (l.visibility = 'public' OR l.created_by = auth.uid())
  ));

-- Service Role writes only, through the server-side lobby action.
COMMIT;
