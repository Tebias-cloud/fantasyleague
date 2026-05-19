-- Habilitar extensión pgcrypto para gen_random_uuid() si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CREACIÓN DE TABLAS
-- ==========================================

-- Tabla: lobbies
CREATE TABLE public.lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Tabla: players
CREATE TABLE public.players (
    puuid TEXT PRIMARY KEY,
    game_name TEXT NOT NULL,
    tag_line TEXT NOT NULL
);

-- Tabla Pivote: lobby_players
CREATE TABLE public.lobby_players (
    lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
    player_puuid TEXT NOT NULL REFERENCES public.players(puuid) ON DELETE CASCADE,
    start_absolute_lp INTEGER NOT NULL,
    start_wins INTEGER NOT NULL,
    start_losses INTEGER NOT NULL,
    PRIMARY KEY (lobby_id, player_puuid)
);

-- Tabla: player_snapshots
CREATE TABLE public.player_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_puuid TEXT NOT NULL REFERENCES public.players(puuid) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    division TEXT NOT NULL,
    lp INTEGER NOT NULL,
    total_wins INTEGER NOT NULL,
    total_losses INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas de Lobbies
CREATE POLICY "Permitir lectura pública de lobbies" 
ON public.lobbies FOR SELECT 
USING (true);

CREATE POLICY "Restringir inserción de lobbies a usuarios autenticados" 
ON public.lobbies FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Restringir actualización de lobbies a usuarios autenticados" 
ON public.lobbies FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Políticas de Players
CREATE POLICY "Permitir lectura pública de players" 
ON public.players FOR SELECT 
USING (true);

CREATE POLICY "Restringir inserción de players a usuarios autenticados" 
ON public.players FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Restringir actualización de players a usuarios autenticados" 
ON public.players FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Políticas de Lobby_Players
CREATE POLICY "Permitir lectura pública de lobby_players" 
ON public.lobby_players FOR SELECT 
USING (true);

CREATE POLICY "Restringir inserción de lobby_players a usuarios autenticados" 
ON public.lobby_players FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Restringir actualización de lobby_players a usuarios autenticados" 
ON public.lobby_players FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Políticas de Player_Snapshots
CREATE POLICY "Permitir lectura pública de player_snapshots" 
ON public.player_snapshots FOR SELECT 
USING (true);

CREATE POLICY "Restringir inserción de player_snapshots a usuarios autenticados" 
ON public.player_snapshots FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Restringir actualización de player_snapshots a usuarios autenticados" 
ON public.player_snapshots FOR UPDATE 
USING (auth.role() = 'authenticated');
