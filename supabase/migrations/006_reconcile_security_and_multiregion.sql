-- ==========================================
-- 006: Reconcile security and multi-region foundation
-- ==========================================
-- Reconciles the audited existing schema with the intended final state of
-- migrations 004 and 005 without deleting existing data or tables.
-- ==========================================

BEGIN;

-- -----------------------------------------------------
-- 1. BASE TABLE SECURITY
-- -----------------------------------------------------

ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_snapshots ENABLE ROW LEVEL SECURITY;

-- Keep public reads and restrict all mutations to the lobby owner or service
-- role (service role bypasses RLS).
DROP POLICY IF EXISTS "Permitir lectura pública de lobbies" ON public.lobbies;
CREATE POLICY "Permitir lectura pública de lobbies"
  ON public.lobbies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Restringir inserción de lobbies a usuarios autenticados" ON public.lobbies;
DROP POLICY IF EXISTS "Restringir actualización de lobbies a usuarios autenticados" ON public.lobbies;
DROP POLICY IF EXISTS "Permitir inserción a creador autenticado" ON public.lobbies;
DROP POLICY IF EXISTS "Permitir actualización solo al propietario" ON public.lobbies;
DROP POLICY IF EXISTS "Permitir eliminación solo al propietario" ON public.lobbies;

CREATE POLICY "Permitir inserción a creador autenticado"
  ON public.lobbies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Permitir actualización solo al propietario"
  ON public.lobbies FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Permitir eliminación solo al propietario"
  ON public.lobbies FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Permitir lectura pública de players" ON public.players;
CREATE POLICY "Permitir lectura pública de players"
  ON public.players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Restringir inserción de players a usuarios autenticados" ON public.players;
DROP POLICY IF EXISTS "Restringir actualización de players a usuarios autenticados" ON public.players;
DROP POLICY IF EXISTS "Permitir inserción de players solo al backend" ON public.players;
DROP POLICY IF EXISTS "Permitir actualización de players solo al backend" ON public.players;
DROP POLICY IF EXISTS "Permitir eliminación de players solo al backend" ON public.players;

DROP POLICY IF EXISTS "Permitir lectura pública de lobby_players" ON public.lobby_players;
CREATE POLICY "Permitir lectura pública de lobby_players"
  ON public.lobby_players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Restringir inserción de lobby_players a usuarios autenticados" ON public.lobby_players;
DROP POLICY IF EXISTS "Restringir actualización de lobby_players a usuarios autenticados" ON public.lobby_players;
DROP POLICY IF EXISTS "Permitir inserción de jugadores solo al propietario de la sala" ON public.lobby_players;
DROP POLICY IF EXISTS "Permitir actualización de jugadores solo al propietario de la sala" ON public.lobby_players;
DROP POLICY IF EXISTS "Permitir eliminación de jugadores solo al propietario de la sala" ON public.lobby_players;

CREATE POLICY "Permitir inserción de jugadores solo al propietario de la sala"
  ON public.lobby_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lobbies
      WHERE lobbies.id = lobby_players.lobby_id
        AND lobbies.created_by = auth.uid()
    )
  );

CREATE POLICY "Permitir actualización de jugadores solo al propietario de la sala"
  ON public.lobby_players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lobbies
      WHERE lobbies.id = lobby_players.lobby_id
        AND lobbies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lobbies
      WHERE lobbies.id = lobby_players.lobby_id
        AND lobbies.created_by = auth.uid()
    )
  );

CREATE POLICY "Permitir eliminación de jugadores solo al propietario de la sala"
  ON public.lobby_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lobbies
      WHERE lobbies.id = lobby_players.lobby_id
        AND lobbies.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Permitir lectura pública de player_snapshots" ON public.player_snapshots;
CREATE POLICY "Permitir lectura pública de player_snapshots"
  ON public.player_snapshots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Restringir inserción de player_snapshots a usuarios autenticados" ON public.player_snapshots;
DROP POLICY IF EXISTS "Restringir actualización de player_snapshots a usuarios autenticados" ON public.player_snapshots;
DROP POLICY IF EXISTS "Permitir inserción de player_snapshots solo al backend" ON public.player_snapshots;
DROP POLICY IF EXISTS "Permitir actualización de player_snapshots solo al backend" ON public.player_snapshots;
DROP POLICY IF EXISTS "Permitir eliminación de player_snapshots solo al backend" ON public.player_snapshots;

-- -----------------------------------------------------
-- 2. MULTI-REGION AND COMPETITION COLUMNS
-- -----------------------------------------------------

ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) NOT NULL DEFAULT 'free';

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS platform VARCHAR(10);

ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_tier TEXT,
  ADD COLUMN IF NOT EXISTS start_division TEXT,
  ADD COLUMN IF NOT EXISTS start_lp INTEGER,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_match_at TIMESTAMPTZ;

-- Existing participants only need a deterministic join timestamp. Detailed
-- rank fields remain NULL because the legacy rows do not contain that data.
UPDATE public.lobby_players lp
SET joined_at = l.start_date
FROM public.lobbies l
WHERE lp.lobby_id = l.id
  AND lp.joined_at IS NULL;

ALTER TABLE public.lobby_players
  ALTER COLUMN joined_at SET DEFAULT now();

ALTER TABLE public.lobby_players
  ALTER COLUMN joined_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lobby_players_active
  ON public.lobby_players(lobby_id, active);

-- -----------------------------------------------------
-- 3. MATCH AND AGGREGATE TABLES
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lobby_player_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL,
  player_puuid TEXT NOT NULL,
  match_id TEXT NOT NULL,
  game_creation TIMESTAMPTZ NOT NULL,
  game_duration INTEGER NOT NULL,
  queue_id INTEGER NOT NULL DEFAULT 420,
  win BOOLEAN NOT NULL,
  champion_name TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  cs INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  largest_killing_spree INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lobby_player_stats (
  lobby_id UUID NOT NULL,
  player_puuid TEXT NOT NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  cs INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  largest_killing_spree INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobby_player_matches'::regclass
      AND conname = 'lobby_player_matches_pkey'
  ) THEN
    ALTER TABLE public.lobby_player_matches
      ADD CONSTRAINT lobby_player_matches_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobby_player_matches'::regclass
      AND conname = 'uq_lobby_player_match'
  ) THEN
    ALTER TABLE public.lobby_player_matches
      ADD CONSTRAINT uq_lobby_player_match
      UNIQUE (lobby_id, player_puuid, match_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobby_player_matches'::regclass
      AND conname = 'chk_soloq_only'
  ) THEN
    ALTER TABLE public.lobby_player_matches
      ADD CONSTRAINT chk_soloq_only
      CHECK (queue_id = 420);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobby_player_matches'::regclass
      AND conname = 'fk_lpm_lobby_player'
  ) THEN
    ALTER TABLE public.lobby_player_matches
      ADD CONSTRAINT fk_lpm_lobby_player
      FOREIGN KEY (lobby_id, player_puuid)
      REFERENCES public.lobby_players(lobby_id, player_puuid)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobby_player_stats'::regclass
      AND conname = 'lobby_player_stats_pkey'
  ) THEN
    ALTER TABLE public.lobby_player_stats
      ADD CONSTRAINT lobby_player_stats_pkey
      PRIMARY KEY (lobby_id, player_puuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobby_player_stats'::regclass
      AND conname = 'fk_lps_lobby_player'
  ) THEN
    ALTER TABLE public.lobby_player_stats
      ADD CONSTRAINT fk_lps_lobby_player
      FOREIGN KEY (lobby_id, player_puuid)
      REFERENCES public.lobby_players(lobby_id, player_puuid)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobbies'::regclass
      AND conname = 'chk_lobbies_min_duration'
  ) THEN
    ALTER TABLE public.lobbies
      ADD CONSTRAINT chk_lobbies_min_duration
      CHECK (end_date >= start_date + INTERVAL '7 days') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lobbies'::regclass
      AND conname = 'chk_lobbies_max_duration'
  ) THEN
    ALTER TABLE public.lobbies
      ADD CONSTRAINT chk_lobbies_max_duration
      CHECK (end_date <= start_date + INTERVAL '90 days') NOT VALID;
  END IF;
END $$;

ALTER TABLE public.lobbies
  VALIDATE CONSTRAINT chk_lobbies_min_duration;

ALTER TABLE public.lobbies
  VALIDATE CONSTRAINT chk_lobbies_max_duration;

CREATE INDEX IF NOT EXISTS idx_lobby_player_matches_timeline
  ON public.lobby_player_matches(lobby_id, player_puuid, game_creation DESC);

ALTER TABLE public.lobby_player_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de lobby_player_matches" ON public.lobby_player_matches;
CREATE POLICY "Permitir lectura publica de lobby_player_matches"
  ON public.lobby_player_matches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de lobby_player_stats" ON public.lobby_player_stats;
CREATE POLICY "Permitir lectura publica de lobby_player_stats"
  ON public.lobby_player_stats FOR SELECT
  USING (true);

COMMIT;
