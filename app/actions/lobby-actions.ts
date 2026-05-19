"use server";

import { createClient } from '@supabase/supabase-js';
import { calculateAbsoluteLP } from '@/lib/riot-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

import { getPlayerFullData } from '@/lib/riot-api';

export async function createLobby(formData: {
  name: string;
  startDate: string;
  endDate: string;
  onlyUnranked: boolean;
  maxPlayers: number;
  players: string;
}) {
  // 1. Crear el lobby
  const { data: lobbyData, error: lobbyError } = await supabaseAdmin
    .from('lobbies')
    .insert([
      {
        name: formData.name,
        start_date: new Date(formData.startDate).toISOString(),
        end_date: new Date(formData.endDate).toISOString(),
        settings: {
          onlyUnranked: formData.onlyUnranked,
          maxPlayers: formData.maxPlayers,
        },
        active: true,
      }
    ])
    .select('id')
    .single();

  if (lobbyError) {
    console.error("Error creating lobby:", lobbyError);
    throw new Error("Failed to create lobby");
  }

  const lobbyId = lobbyData.id;

  // 2. Procesar jugadores
  const playerLines = formData.players
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const validPlayerLines = playerLines.filter(line => line.includes('#'));

  if (playerLines.length > 0 && validPlayerLines.length === 0) {
    // Si metió texto pero nada con '#'
    throw new Error("Debes incluir el #TAG de Riot para cada jugador (ej: Nombre#TAG)");
  }

  for (const line of validPlayerLines) {
    const [gameName, tagLine] = line.split('#');
    if (!gameName || !tagLine) continue;

    try {
      // Fetch from Riot API
      const riotData = await getPlayerFullData(gameName, tagLine);
      
      // UPSERT en players table
      await supabaseAdmin
        .from('players')
        .upsert({
          puuid: riotData.puuid,
          game_name: riotData.game_name,
          tag_line: riotData.tag_line,
        });

      // Insert en lobby_players
      await supabaseAdmin
        .from('lobby_players')
        .insert({
          lobby_id: lobbyId,
          player_puuid: riotData.puuid,
          start_absolute_lp: riotData.current_absolute_lp,
          start_wins: riotData.wins,
          start_losses: riotData.losses,
        });

      // Insert initial snapshot
      await supabaseAdmin
        .from('player_snapshots')
        .insert({
          player_puuid: riotData.puuid,
          tier: riotData.tier,
          division: riotData.division,
          lp: riotData.lp,
          total_wins: riotData.wins,
          total_losses: riotData.losses,
        });
        
    } catch (error) {
      console.error(`Error processing player ${line}:`, error);
      // Podríamos agregar a una lista de errores para avisar al usuario,
      // pero por el MVP simplemente saltamos el jugador si falla.
    }
  }

  return lobbyId;
}

export async function getLobbyPlayers(lobbyId: string) {
  const { data, error } = await supabaseAdmin
    .from('lobby_players')
    .select(`
      start_absolute_lp,
      start_wins,
      start_losses,
      player:players (
        puuid,
        game_name,
        tag_line,
        profile_icon_id,
        player_snapshots (
          tier,
          division,
          lp,
          total_wins,
          total_losses,
          created_at
        )
      )
    `)
    .eq('lobby_id', lobbyId);

  if (error) {
    console.error("Error fetching lobby players:", error);
    throw new Error("Failed to fetch lobby players");
  }

  return data.map((row: any) => {
    // Si player es un arreglo (dependiendo de la FK de Supabase, puede venir como array), lo tomamos.
    const player = Array.isArray(row.player) ? row.player[0] : row.player;
    
    const snapshots = player.player_snapshots.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const latestSnapshot = snapshots[snapshots.length - 1];
    
    const currentTier = latestSnapshot?.tier || 'UNRANKED';
    const currentDivision = latestSnapshot?.division || '';
    const currentLp = latestSnapshot?.lp || 0;
    const currentWins = latestSnapshot?.total_wins || row.start_wins;
    const currentLosses = latestSnapshot?.total_losses || row.start_losses;

    const currentAbsoluteLp = calculateAbsoluteLP(currentTier, currentDivision, currentLp);
    const delta = currentAbsoluteLp - row.start_absolute_lp;
    
    const totalGames = currentWins + currentLosses;
    const winrate = totalGames > 0 ? Math.round((currentWins / totalGames) * 100) : 0;

    const history = snapshots.map((snap: any) => {
      const snapAbsLp = calculateAbsoluteLP(snap.tier, snap.division, snap.lp);
      return {
        date: new Date(snap.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        lp: snapAbsLp
      };
    });

    if (history.length === 0) {
      history.push({
        date: 'Inicio',
        lp: row.start_absolute_lp
      });
    }

    return {
      puuid: player.puuid,
      game_name: player.game_name,
      tag_line: player.tag_line,
      profile_icon_id: player.profile_icon_id,
      start_absolute_lp: row.start_absolute_lp,
      current_absolute_lp: currentAbsoluteLp,
      delta,
      tier: currentTier,
      division: currentDivision,
      lp: currentLp,
      wins: Math.max(0, currentWins - row.start_wins),
      losses: Math.max(0, currentLosses - row.start_losses),
      winrate,
      history
    };
  });
}

export async function getRecentLobbies() {
  const { data, error } = await supabaseAdmin
    .from('lobbies')
    .select('id, name, start_date, end_date, active')
    .eq('active', true)
    .order('start_date', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching recent lobbies:", error);
    return [];
  }

  return data;
}

export async function getAllLobbies() {
  const { data, error } = await supabaseAdmin
    .from('lobbies')
    .select('id, name, start_date, end_date, active')
    .order('start_date', { ascending: false });

  if (error) {
    console.error("Error fetching all lobbies:", error);
    return [];
  }

  return data;
}

export async function updateLobby(id: string, data: { name?: string; end_date?: string }) {
  const updates: any = {};
  if (data.name) updates.name = data.name;
  if (data.end_date) updates.end_date = data.end_date;

  const { error } = await supabaseAdmin
    .from('lobbies')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error("Error updating lobby:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteLobby(id: string) {
  const { error } = await supabaseAdmin
    .from('lobbies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting lobby:", error);
    return { error: error.message };
  }

  return { success: true };
}
