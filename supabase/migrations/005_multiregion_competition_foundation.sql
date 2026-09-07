-- ==========================================
-- 005: Multi-region Competition & SaaS Foundation
-- ==========================================
-- Introduce soporte para:
-- 1. Multi-región / servidores (platform nullable en players para evitar falsos defaults en legacy)
-- 2. Baseline permanente y auditoría de reingreso (joined_at con backfill legacy, active, left_at, start_tier, start_division, start_lp)
-- 3. Watermark incremental para Match-V5 (last_match_at)
-- 4. Detalle granular de partidas SoloQ (lobby_player_matches con FK compuesta a lobby_players)
-- 5. Estadísticas agregadas materializadas (lobby_player_stats con FK compuesta a lobby_players)
-- 6. Reglas de torneo y preparación SaaS (plan_tier, check constraints NOT VALID para no romper lobbies legacy)
-- 7. RLS estricto (solo lectura pública; escrituras restringidas exclusivamente a Service Role)
--
-- ESTADO: PREPARADA — NO APLICADA
-- No destructiva: 100% segura contra datos legacy.
-- ==========================================

-- -----------------------------------------------------
-- 1. EXTENSIÓN DE TABLA: lobbies (SaaS & Reglas de Torneo)
-- -----------------------------------------------------

-- Plan del lobby para futuras cuotas / límites SaaS
ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) NOT NULL DEFAULT 'free';

-- Reglas de duración de torneo:
-- Mínimo 7 días, máximo inicial 90 días
-- Se añaden como NOT VALID para evitar que fallen ante lobbies legacy de prueba preexistentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lobbies_min_duration'
  ) THEN
    ALTER TABLE public.lobbies
      ADD CONSTRAINT chk_lobbies_min_duration 
      CHECK (end_date >= start_date + INTERVAL '7 days') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lobbies_max_duration'
  ) THEN
    ALTER TABLE public.lobbies
      ADD CONSTRAINT chk_lobbies_max_duration 
      CHECK (end_date <= start_date + INTERVAL '90 days') NOT VALID;
  END IF;
END $$;


-- -----------------------------------------------------
-- 2. EXTENSIÓN DE TABLA: players (Multi-Región)
-- -----------------------------------------------------

-- Plataforma/servidor de League of Legends (ej: la2, la1, na1, euw1, kr, etc.)
-- Se define NULLABLE inicialmente sin asumir 'la2' para no clasificar incorrectamente jugadores legacy.
-- El routing regional (americas, europe, asia, sea) se deriva en código mediante helper estático.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS platform VARCHAR(10);


-- -----------------------------------------------------
-- 3. EXTENSIÓN DE TABLA: lobby_players (Baseline Permanente, Reingreso y Watermark)
-- -----------------------------------------------------

-- Fecha y hora de incorporación a la sala.
-- Para filas nuevas toma now(); para registros legacy se backfillea con start_date del lobby.
ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.lobby_players lp
SET joined_at = l.start_date
FROM public.lobbies l
WHERE lp.lobby_id = l.id
  AND lp.joined_at > l.start_date;

-- Baseline detallado: nullable para no inyectar datos falsos ('UNRANKED' / 0) en participantes legacy
-- donde solo se registraba start_absolute_lp.
ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS start_tier TEXT;

ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS start_division TEXT;

ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS start_lp INTEGER;

-- Control de estado de participación (soft removal para prevenir exploit de reseteo de baseline)
ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- Watermark de sincronización incremental para Match-V5
ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS last_match_at TIMESTAMPTZ;

-- Índice justificado para filtros de leaderboard y sync (WHERE lobby_id = ? AND active = true)
CREATE INDEX IF NOT EXISTS idx_lobby_players_active
  ON public.lobby_players(lobby_id, active);


-- -----------------------------------------------------
-- 4. TABLA: lobby_player_matches (Historial Incremental de Partidas SoloQ)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lobby_player_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID NOT NULL,
    player_puuid TEXT NOT NULL,
    match_id TEXT NOT NULL,
    game_creation TIMESTAMPTZ NOT NULL,
    game_duration INTEGER NOT NULL, -- Duración en segundos
    queue_id INTEGER NOT NULL DEFAULT 420, -- 420 = SoloQ
    win BOOLEAN NOT NULL,
    champion_name TEXT NOT NULL,
    kills INTEGER NOT NULL DEFAULT 0,
    deaths INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    cs INTEGER NOT NULL DEFAULT 0,
    gold_earned INTEGER NOT NULL DEFAULT 0,
    largest_killing_spree INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lobby_player_match UNIQUE (lobby_id, player_puuid, match_id),
    CONSTRAINT chk_soloq_only CHECK (queue_id = 420),
    CONSTRAINT fk_lpm_lobby_player FOREIGN KEY (lobby_id, player_puuid)
        REFERENCES public.lobby_players(lobby_id, player_puuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lobby_player_matches_timeline
  ON public.lobby_player_matches(lobby_id, player_puuid, game_creation DESC);


-- -----------------------------------------------------
-- 5. TABLA: lobby_player_stats (Estadísticas Agregadas Materializadas)
-- -----------------------------------------------------

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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (lobby_id, player_puuid),
    CONSTRAINT fk_lps_lobby_player FOREIGN KEY (lobby_id, player_puuid)
        REFERENCES public.lobby_players(lobby_id, player_puuid) ON DELETE CASCADE
);


-- -----------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) PARA NUEVAS TABLAS
-- -----------------------------------------------------
-- En consistencia estricta con 004:
-- - Lectura pública (SELECT público para visualización en Leaderboards)
-- - Escrituras bloqueadas para anon y authenticated. Solo Service Role (Server Actions) puede escribir.

ALTER TABLE public.lobby_player_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de lobby_player_matches"
  ON public.lobby_player_matches FOR SELECT
  USING (true);

CREATE POLICY "Permitir lectura publica de lobby_player_stats"
  ON public.lobby_player_stats FOR SELECT
  USING (true);
