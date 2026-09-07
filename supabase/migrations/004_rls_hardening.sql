-- ==========================================
-- 004: Hardening Row Level Security (RLS) policies (F5)
-- ==========================================
-- Refuerza las políticas de seguridad en Supabase para evitar
-- mutaciones no autorizadas vía cliente directo (anon / authenticated).
--
-- ESTADO: PREPARADA, NO APLICADA
-- ==========================================

-- -----------------------------------------------------
-- 1. TABLA: lobbies
-- -----------------------------------------------------

-- Eliminar políticas anteriores permisivas de lobbies si existen
DROP POLICY IF EXISTS "Restringir inserción de lobbies a usuarios autenticados" ON public.lobbies;
DROP POLICY IF EXISTS "Restringir actualización de lobbies a usuarios autenticados" ON public.lobbies;
DROP POLICY IF EXISTS "Permitir inserción a creador autenticado" ON public.lobbies;
DROP POLICY IF EXISTS "Permitir actualización solo al propietario" ON public.lobbies;
DROP POLICY IF EXISTS "Permitir eliminación solo al propietario" ON public.lobbies;

-- Inserción: Solo el usuario autenticado puede crearse como propietario (created_by = auth.uid())
CREATE POLICY "Permitir inserción a creador autenticado"
ON public.lobbies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Actualización: Solo el creador del lobby puede modificarlo
CREATE POLICY "Permitir actualización solo al propietario"
ON public.lobbies FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Eliminación: Solo el creador del lobby puede borrarlo
CREATE POLICY "Permitir eliminación solo al propietario"
ON public.lobbies FOR DELETE
TO authenticated
USING (auth.uid() = created_by);


-- -----------------------------------------------------
-- 2. TABLA: lobby_players
-- -----------------------------------------------------

-- Eliminar políticas permisivas anteriores
DROP POLICY IF EXISTS "Restringir inserción de lobby_players a usuarios autenticados" ON public.lobby_players;
DROP POLICY IF EXISTS "Restringir actualización de lobby_players a usuarios autenticados" ON public.lobby_players;
DROP POLICY IF EXISTS "Permitir inserción de jugadores solo al propietario de la sala" ON public.lobby_players;
DROP POLICY IF EXISTS "Permitir actualización de jugadores solo al propietario de la sala" ON public.lobby_players;
DROP POLICY IF EXISTS "Permitir eliminación de jugadores solo al propietario de la sala" ON public.lobby_players;

-- Inserción: Solo el dueño de la sala puede asociar jugadores a ella
CREATE POLICY "Permitir inserción de jugadores solo al propietario de la sala"
ON public.lobby_players FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE lobbies.id = lobby_players.lobby_id
      AND lobbies.created_by = auth.uid()
  )
);

-- Actualización: Solo el dueño de la sala puede actualizar la relación
CREATE POLICY "Permitir actualización de jugadores solo al propietario de la sala"
ON public.lobby_players FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE lobbies.id = lobby_players.lobby_id
      AND lobbies.created_by = auth.uid()
  )
);

-- Eliminación: Solo el dueño de la sala puede desvincular jugadores
CREATE POLICY "Permitir eliminación de jugadores solo al propietario de la sala"
ON public.lobby_players FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE lobbies.id = lobby_players.lobby_id
      AND lobbies.created_by = auth.uid()
  )
);


-- -----------------------------------------------------
-- 3. TABLA: player_snapshots
-- -----------------------------------------------------

-- Eliminar políticas directas de inserción/actualización desde clientes no privilegiados
-- Las snapshots deben ser generadas exclusivamente por el backend mediante Server Actions con Service Role
DROP POLICY IF EXISTS "Restringir inserción de player_snapshots a usuarios autenticados" ON public.player_snapshots;
DROP POLICY IF EXISTS "Restringir actualización de player_snapshots a usuarios autenticados" ON public.player_snapshots;


-- -----------------------------------------------------
-- 4. TABLA: players
-- -----------------------------------------------------

-- Eliminar actualización directa arbitraria de perfiles de jugadores por clientes
DROP POLICY IF EXISTS "Restringir actualización de players a usuarios autenticados" ON public.players;
