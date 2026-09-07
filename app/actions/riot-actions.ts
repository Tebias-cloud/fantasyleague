'use server';

import { createClient } from '@supabase/supabase-js';
import { getPlayerFullData, getPlayerRecentMatches, RiotApiError } from '@/lib/riot-api';
import { requireAuth } from '@/lib/auth';
import { LobbySettings } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function addPlayerToLobby(lobbyId: string, gameName: string, tagLine: string) {
  try {
    const user = await requireAuth();

    const trimmedGameName = (gameName || '').trim();
    const trimmedTagLine = (tagLine || '').trim().replace(/^#/, '');

    if (!trimmedGameName || !trimmedTagLine) {
      return { error: 'Faltan campos obligatorios (Nombre o Tag).' };
    }

    if (trimmedGameName.length > 24 || trimmedTagLine.length > 8) {
      return { error: 'Formato de Riot ID inválido (longitud no válida).' };
    }

    // 1. Check ownership and lobby settings
    const { data: lobby, error: lobbyFetchError } = await supabaseAdmin
      .from('lobbies')
      .select('created_by, settings')
      .eq('id', lobbyId)
      .single();

    if (lobbyFetchError || !lobby) {
      return { error: 'Sala no encontrada.' };
    }

    if (!lobby.created_by || lobby.created_by !== user.id) {
      return { error: 'Solo el creador de la sala puede añadir jugadores.' };
    }

    const settings = (lobby.settings || {}) as LobbySettings;

    // 2. Validate maxPlayers setting if configured
    if (typeof settings.maxPlayers === 'number' && settings.maxPlayers > 0) {
      const { count, error: countError } = await supabaseAdmin
        .from('lobby_players')
        .select('*', { count: 'exact', head: true })
        .eq('lobby_id', lobbyId);

      if (!countError && typeof count === 'number' && count >= settings.maxPlayers) {
        return { error: `La sala ha alcanzado el límite máximo de ${settings.maxPlayers} jugadores.` };
      }
    }

    // 3. Fetch full player data from Riot Games API
    const player = await getPlayerFullData(trimmedGameName, trimmedTagLine);

    // 4. Validate onlyUnranked setting if configured
    if (settings.onlyUnranked && player.tier !== 'UNRANKED') {
      return { error: 'Esta sala está configurada para aceptar únicamente jugadores Unranked.' };
    }

    // 5. Upsert en public.players
    const { error: playersError } = await supabaseAdmin
      .from('players')
      .upsert([{
        puuid: player.puuid,
        game_name: player.game_name,
        tag_line: player.tag_line,
        profile_icon_id: player.profile_icon_id,
      }]);

    if (playersError) throw playersError;

    // 6. Insert en public.lobby_players
    const { error: lobbyPlayersError } = await supabaseAdmin
      .from('lobby_players')
      .insert([{
        lobby_id: lobbyId,
        player_puuid: player.puuid,
        start_absolute_lp: player.current_absolute_lp,
        start_wins: player.wins,
        start_losses: player.losses,
      }]);

    if (lobbyPlayersError) {
      if (lobbyPlayersError.code === '23505') {
        return { error: 'El jugador ya está en esta sala.' };
      }
      throw lobbyPlayersError;
    }

    // 7. Insert primer snapshot en public.player_snapshots
    const { error: snapshotsError } = await supabaseAdmin
      .from('player_snapshots')
      .insert([{
        player_puuid: player.puuid,
        tier: player.tier,
        division: player.division,
        lp: player.lp,
        total_wins: player.wins,
        total_losses: player.losses,
      }]);

    if (snapshotsError) throw snapshotsError;

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      return { error: 'Debes iniciar sesión para añadir jugadores.' };
    }
    if (error instanceof RiotApiError) {
      if (error.status === 404) return { error: 'Jugador no encontrado. Revisa el Nombre y el Tag.' };
      if (error.status === 429) return { error: 'Demasiadas peticiones a Riot. Inténtalo en un momento.' };
      if (error.status === 401 || error.status === 403) return { error: 'La API Key de Riot ha expirado o es inválida.' };
      if (error.status === 408) return { error: 'El servidor de Riot tardó demasiado en responder.' };
      if (error.status && error.status >= 500) return { error: 'Los servidores de Riot están fallando en este momento.' };
    }
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al añadir jugador:', errMsg);
    return { error: 'Ocurrió un error al añadir al jugador.' };
  }
}

interface LobbyPlayerWithProfile {
  player_puuid: string;
  players: {
    game_name: string;
    tag_line: string;
  } | {
    game_name: string;
    tag_line: string;
  }[] | null;
}

export async function refreshLobbyPlayers(lobbyId: string) {
  try {
    const user = await requireAuth();

    // Check ownership
    const { data: lobby, error: lobbyFetchError } = await supabaseAdmin
      .from('lobbies')
      .select('created_by')
      .eq('id', lobbyId)
      .single();

    if (lobbyFetchError || !lobby) {
      return { error: 'Sala no encontrada.' };
    }

    if (!lobby.created_by || lobby.created_by !== user.id) {
      return { error: 'Solo el creador de la sala puede actualizar los datos de los jugadores.' };
    }

    const { data: lobbyPlayers, error: fetchError } = await supabaseAdmin
      .from('lobby_players')
      .select('player_puuid, players(game_name, tag_line)')
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
        const data = await getPlayerFullData(p.game_name, p.tag_line);
        
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
          player_puuid: data.puuid,
          tier: data.tier,
          division: data.division,
          lp: data.lp,
          total_wins: data.wins,
          total_losses: data.losses,
        });
        
        await new Promise((res) => setTimeout(res, 150));
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
        .from('player_snapshots')
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

export async function getPlayerMatchesAction(puuid: string) {
  try {
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('tag_line')
      .eq('puuid', puuid)
      .single();

    const tagLine = player?.tag_line || 'LAS';
    return await getPlayerRecentMatches(puuid, tagLine);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`Error in getPlayerMatchesAction for ${puuid}:`, errMsg);
    return [];
  }
}
