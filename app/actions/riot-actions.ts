'use server';

import { createClient } from '@supabase/supabase-js';
import { getPlayerFullData, getPlayerRecentMatches, RiotApiError } from '@/lib/riot-api';
import { requireAuth } from '@/lib/auth';
import { LobbySettings } from '@/types/database.types';
import { accessLobby } from '@/lib/lobby-access';
import { ensureLiveRiotAllowed } from '@/lib/riot-policy';
import { isRiotPlatform, normalizeRiotId } from '@/lib/competition';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function addPlayerToLobby(
  lobbyId: string, gameName: string, tagLine: string, platform: string, inviteToken?: string
) {
  if (process.env.FANTASYLEAGUE_DEMO_ONLY === 'true') return { error: 'Modo demostración: inscripciones deshabilitadas.' };
  try {
    await requireAuth();
    const access = await accessLobby(lobbyId, inviteToken);
    if (!access) return { error: 'Sala privada: abre un enlace de invitación válido.' };
    const lobby = access.lobby;
    if (new Date(lobby.end_date).getTime() <= Date.now()) return { error: 'La competencia finalizó.' };
    if (!isRiotPlatform(platform)) return { error: 'Selecciona el servidor real del jugador.' };
    const identity = normalizeRiotId(gameName, tagLine);
    const settings = (lobby.settings || {}) as LobbySettings;
    const maxPlayers = Math.min(20, settings.maxPlayers || 20);

    const { count } = await supabaseAdmin.from('lobby_players')
      .select('*', { count: 'exact', head: true }).eq('lobby_id', lobbyId);
    if ((count ?? 0) >= maxPlayers) return { error: 'La sala está llena.' };

    try { ensureLiveRiotAllowed(); }
    catch { return { error: 'Consultas Riot desactivadas. Para pruebas reales usa una clave local válida.' }; }
    const player = await getPlayerFullData(identity.gameName, identity.tagLine, platform);

    if (settings.onlyUnranked && player.tier !== 'UNRANKED') {
      return { error: 'Esta sala solo acepta jugadores Unranked.' };
    }
    const { error: upsertError } = await supabaseAdmin.from('players').upsert({
      puuid: player.puuid, game_name: player.game_name, tag_line: player.tag_line,
      platform, profile_icon_id: player.profile_icon_id,
    });
    if (upsertError) throw upsertError;
    const { error: insertError } = await supabaseAdmin.from('lobby_players').insert({
      lobby_id: lobbyId, player_puuid: player.puuid,
      start_absolute_lp: player.current_absolute_lp,
      start_wins: player.wins, start_losses: player.losses,
      joined_at: new Date().toISOString(), start_tier: player.tier,
      start_division: player.division, start_lp: player.lp,
    });
    if (insertError) {
      if (insertError.code === '23505') return { error: 'Ese jugador ya participa en esta sala.' };
      return { error: insertError.message.includes('Sala llena') ? 'Sala llena.' : 'No se pudo registrar al jugador.' };
    }
    const { error: snapshotError } = await supabaseAdmin.from('lobby_player_snapshots').insert({
      lobby_id: lobbyId, player_puuid: player.puuid, tier: player.tier, division: player.division,
      lp: player.lp, total_wins: player.wins, total_losses: player.losses,
    });
    if (snapshotError) {
      // No mostrar un jugador sin baseline/historial válido.
      await supabaseAdmin.from('lobby_players').delete().eq('lobby_id', lobbyId).eq('player_puuid', player.puuid);
      throw snapshotError;
    }
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      return { error: 'Debes iniciar sesión para unirte a la competición.' };
    }
    if (error instanceof RiotApiError) {
      if (error.status === 404) return { error: 'Riot ID no encontrado en ese servidor. Comprueba el servidor real.' };
      if (error.status === 429) return { error: 'Límite de Riot alcanzado. Reintenta más tarde.' };
      if (error.status === 401 || error.status === 403) return { error: 'La clave Riot venció o no tiene permisos.' };
      if (error.status === 408) return { error: 'Riot no respondió a tiempo.' };
    }
    console.error('No se pudo añadir participante:', error);
    return { error: 'No se pudo añadir al participante.' };
  }
}

interface LobbyPlayerWithProfile {
  player_puuid: string;
  players: {
    game_name: string;
    tag_line: string;
    platform: string | null;
  } | {
    game_name: string;
    tag_line: string;
    platform: string | null;
  }[] | null;
}

export async function refreshLobbyPlayers(lobbyId: string) {
  if (process.env.FANTASYLEAGUE_DEMO_ONLY === 'true') return { error: 'Modo demostración: actualización deshabilitada.' };
  try {
    const user = await requireAuth();

    // Check ownership
    const { data: lobby, error: lobbyFetchError } = await supabaseAdmin
      .from('lobbies')
      .select('created_by, end_date')
      .eq('id', lobbyId)
      .single();

    if (lobbyFetchError || !lobby) {
      return { error: 'Sala no encontrada.' };
    }

    if (!lobby.created_by || lobby.created_by !== user.id) {
      return { error: 'Solo el creador de la sala puede actualizar los datos de los jugadores.' };
    }

    if (Date.now() >= new Date(lobby.end_date).getTime()) {
      return { error: 'La sala terminó: sus resultados están cerrados.' };
    }
    try { ensureLiveRiotAllowed(); }
    catch { return { error: 'Riot solo está disponible localmente con clave de desarrollo o tras aprobación.' }; }

    const { data: lobbyPlayers, error: fetchError } = await supabaseAdmin
      .from('lobby_players')
      .select('player_puuid, players(game_name, tag_line, platform)')
      .eq('lobby_id', lobbyId);

    if (fetchError || !lobbyPlayers) throw fetchError;

    const typedLobbyPlayers = lobbyPlayers as unknown as LobbyPlayerWithProfile[];
    const newSnapshots = [];

    // Iterar secuencialmente para cuidar el Rate Limit (Development key limits)
    for (const lp of typedLobbyPlayers) {
      if (!lp.players) continue;
      const p = Array.isArray(lp.players) ? lp.players[0] : lp.players;
      if (!p) continue;

      try {
        if (!p.platform || !isRiotPlatform(p.platform)) continue;
        const data = await getPlayerFullData(p.game_name, p.tag_line, p.platform);
        
        // Actualizar el perfil (por si cambió el ícono o el nombre de invocador)
        await supabaseAdmin
          .from('players')
          .update({
            game_name: data.game_name,
            tag_line: data.tag_line,
            profile_icon_id: data.profile_icon_id,
          })
          .eq('puuid', data.puuid);

        newSnapshots.push({
          lobby_id: lobbyId,
          player_puuid: data.puuid,
          tier: data.tier,
          division: data.division,
          lp: data.lp,
          total_wins: data.wins,
          total_losses: data.losses,
        });
        
        await new Promise((res) => setTimeout(res, 1400));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        console.error(`Error refrescando jugador ${p.game_name}:`, errMsg);
        if (err instanceof RiotApiError && (err.status === 401 || err.status === 403 || err.status === 429)) {
          break; // Stop trying to refresh other players if the key is invalid or rate limited
        }
      }
    }

    if (newSnapshots.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('lobby_player_snapshots')
        .insert(newSnapshots);
      
      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      return { error: 'Debes iniciar sesión para actualizar los jugadores.' };
    }
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al actualizar jugadores:', errMsg);
    return { error: 'Ocurrió un error al actualizar los datos.' };
  }
}

export async function getPlayerMatchesAction(puuid: string, lobbyId: string, inviteToken?: string) {
  try {
    const access = await accessLobby(lobbyId, inviteToken);
    if (!access) return [];
    ensureLiveRiotAllowed();
    const { data: member } = await supabaseAdmin.from('lobby_players')
      .select('player_puuid').eq('lobby_id', lobbyId).eq('player_puuid', puuid).maybeSingle();
    if (!member) return [];
    const { data: player } = await supabaseAdmin.from('players')
      .select('platform').eq('puuid', puuid).maybeSingle();
    if (!player?.platform || !isRiotPlatform(player.platform)) return [];
    return await getPlayerRecentMatches(puuid, player.platform);
  } catch (error: unknown) {
    console.error('Error al consultar partidas SoloQ:', error);
    return [];
  }
}
