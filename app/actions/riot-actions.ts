'use server';

import { createClient } from '@supabase/supabase-js';
import { getPlayerFullData, getPlayerRecentMatches } from '@/lib/riot-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function addPlayerToLobby(lobbyId: string, gameName: string, tagLine: string) {
  try {
    if (!gameName || !tagLine) {
      return { error: 'Faltan campos obligatorios (Nombre o Tag).' };
    }

    const player = await getPlayerFullData(gameName, tagLine);

    // 1. Upsert en public.players (Guardando el profile_icon_id)
    const { error: playersError } = await supabaseAdmin
      .from('players')
      .upsert([{
        puuid: player.puuid,
        game_name: player.game_name,
        tag_line: player.tag_line,
        profile_icon_id: player.profile_icon_id
      }]);

    if (playersError) throw playersError;

    // 2. Insert en public.lobby_players
    const { error: lobbyPlayersError } = await supabaseAdmin
      .from('lobby_players')
      .insert([{
        lobby_id: lobbyId,
        player_puuid: player.puuid,
        start_absolute_lp: player.current_absolute_lp,
        start_wins: player.wins,
        start_losses: player.losses
      }]);

    if (lobbyPlayersError) {
      if (lobbyPlayersError.code === '23505') {
        return { error: 'El jugador ya está en esta sala.' };
      }
      throw lobbyPlayersError;
    }

    // 3. Insert primer snapshot en public.player_snapshots
    const { error: snapshotsError } = await supabaseAdmin
      .from('player_snapshots')
      .insert([{
        player_puuid: player.puuid,
        tier: player.tier,
        division: player.division,
        lp: player.lp,
        total_wins: player.wins,
        total_losses: player.losses
      }]);

    if (snapshotsError) throw snapshotsError;

    return { success: true };
  } catch (error: any) {
    if (error.message === 'NotFound') return { error: 'Jugador no encontrado. Revisa el Nombre y el Tag.' };
    if (error.message === 'RateLimit') return { error: 'Demasiadas peticiones a Riot. Inténtalo en un momento.' };
    console.error(error);
    return { error: 'Ocurrió un error al añadir al jugador.' };
  }
}

export async function refreshLobbyPlayers(lobbyId: string) {
  try {
    const { data: lobbyPlayers, error: fetchError } = await supabaseAdmin
      .from('lobby_players')
      .select('player_puuid, players(game_name, tag_line)')
      .eq('lobby_id', lobbyId);

    if (fetchError || !lobbyPlayers) throw fetchError;

    const newSnapshots = [];

    // Iterar secuencialmente para cuidar el Rate Limit (Development key limits)
    for (const lp of lobbyPlayers) {
      const p = Array.isArray(lp.players) ? lp.players[0] : lp.players;
      try {
        const data = await getPlayerFullData(p.game_name, p.tag_line);
        
        // Actualizar el perfil (por si cambió el ícono o el nombre de invocador)
        await supabaseAdmin
          .from('players')
          .update({
            game_name: data.game_name,
            tag_line: data.tag_line,
            profile_icon_id: data.profile_icon_id
          })
          .eq('puuid', data.puuid);

        newSnapshots.push({
          player_puuid: data.puuid,
          tier: data.tier,
          division: data.division,
          lp: data.lp,
          total_wins: data.wins,
          total_losses: data.losses
        });
        
        await new Promise(res => setTimeout(res, 150));
      } catch (err: any) {
        console.error(`Error refrescando jugador ${p.game_name}:`, err.message);
      }
    }

    if (newSnapshots.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('player_snapshots')
        .insert(newSnapshots);
      
      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error(error);
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
  } catch (error) {
    console.error(`Error in getPlayerMatchesAction for ${puuid}:`, error);
    return [];
  }
}
