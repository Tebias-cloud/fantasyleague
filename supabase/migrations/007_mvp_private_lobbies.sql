-- FantasyLeague MVP: public directory vs protected invite-only rooms.
-- Apply AFTER 006. No existing table data is deleted.
BEGIN;

ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT;

ALTER TABLE public.lobbies
  DROP CONSTRAINT IF EXISTS chk_lobby_visibility;
ALTER TABLE public.lobbies
  ADD CONSTRAINT chk_lobby_visibility CHECK (visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS idx_lobbies_public_recent
  ON public.lobbies(start_date DESC) WHERE visibility = 'public';

-- Private rooms cannot be discovered by querying the client-facing Data API.
-- The application checks invite tokens on the server. Tokens are never stored in plaintext.
DROP POLICY IF EXISTS "Permitir lectura pública de lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Leer lobbies públicos o propios" ON public.lobbies;
CREATE POLICY "Leer lobbies públicos o propios"
  ON public.lobbies FOR SELECT
  USING (visibility = 'public' OR created_by = auth.uid());

DROP POLICY IF EXISTS "Permitir lectura pública de lobby_players" ON public.lobby_players;
DROP POLICY IF EXISTS "Leer participantes de lobbies públicos o propios" ON public.lobby_players;
CREATE POLICY "Leer participantes de lobbies públicos o propios"
  ON public.lobby_players FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lobbies l
    WHERE l.id = lobby_players.lobby_id
      AND (l.visibility = 'public' OR l.created_by = auth.uid())
  ));

-- The current snapshots table has no lobby_id, but it exposes generic ranked
-- information without revealing membership of private lobbies.
-- Dedicated per-lobby historical snapshots are a future migration.

-- Enforce lobby seat cap atomically across concurrent sign-ups.
CREATE OR REPLACE FUNCTION public.enforce_mvp_lobby_seats()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cap INTEGER;
  started TIMESTAMPTZ;
  finished TIMESTAMPTZ;
BEGIN
  SELECT LEAST(20, GREATEST(2, COALESCE((settings->>'maxPlayers')::INTEGER, 20))),
         start_date, end_date
    INTO cap, started, finished
    FROM public.lobbies
    WHERE id = NEW.lobby_id
    FOR UPDATE;

  IF cap IS NULL THEN RAISE EXCEPTION 'Sala no encontrada'; END IF;
  IF now() >= finished THEN RAISE EXCEPTION 'La competencia finalizó'; END IF;
  IF (SELECT COUNT(*) FROM public.lobby_players WHERE lobby_id = NEW.lobby_id) >= cap THEN
    RAISE EXCEPTION 'Sala llena (máximo % participantes)', cap;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS mvp_lobby_capacity ON public.lobby_players;
CREATE TRIGGER mvp_lobby_capacity
  BEFORE INSERT ON public.lobby_players
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mvp_lobby_seats();

COMMIT;
