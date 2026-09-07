"use server";

import { createClient } from '@supabase/supabase-js';
import { calculateAbsoluteLP, getPlayerFullData } from '@/lib/riot-api';
import { requireAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function createLobby(formData: {
  name: string;
  startDate: string;
  endDate: string;
  onlyUnranked: boolean;
  maxPlayers: number;
  players: string;
}) {
  // Gate: only authenticated users can create lobbies.
  const user = await requireAuth();

  const trimmedName = (formData.name || '').trim();
  if (!trimmedName) {
    throw new Error("El nombre de la sala es obligatorio.");
  }

  const startDate = new Date(formData.startDate);
  const endDate = new Date(formData.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Fechas inválidas para la sala.");
  }

  if (startDate >= endDate) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de término.");
  }

  // 1. Crear el lobby
  const { data: lobbyData, error: lobbyError } = await supabaseAdmin
    .from('lobbies')
    .insert([
      {
        name: trimmedName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        settings: {
          onlyUnranked: Boolean(formData.onlyUnranked),
          maxPlayers: Number(formData.maxPlayers) || 10,
        },
        active: true,
        created_by: user.id,
      }
    ])
    .select('id')
    .single();

  if (lobbyError || !lobbyData) {
    console.error("Error creating lobby:", lobbyError);
    throw new Error("No se pudo crear la sala.");
  }

  const lobbyId = lobbyData.id;

  // 2. Procesar jugadores
  const playerLines = formData.players
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const validPlayerLines = playerLines.filter(line => line.includes('#'));

  if (playerLines.length > 0 && validPlayerLines.length === 0) {
    throw new Error("Debes incluir el #TAG de Riot para cada jugador (ej: Nombre#TAG)");
  }

  for (const line of validPlayerLines) {
    const [gameName, tagLine] = line.split('#');
    if (!gameName || !tagLine) continue;

    try {
      const riotData = await getPlayerFullData(gameName.trim(), tagLine.trim().replace(/^#/, ''));
      
      // UPSERT en players table
      await supabaseAdmin
        .from('players')
        .upsert({
          puuid: riotData.puuid,
          game_name: riotData.game_name,
          tag_line: riotData.tag_line,
          profile_icon_id: riotData.profile_icon_id,
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
        
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error procesando jugador';
      console.error(`Error processing player ${line}:`, errMsg);
    }
  }

  return lobbyId;
}

interface RawSnapshot {
  tier: string;
  division: string;
  lp: number;
  total_wins: number;
  total_losses: number;
  created_at: string;
}

interface RawPlayer {
  puuid: string;
  game_name: string;
  tag_line: string;
  profile_icon_id: number | null;
  player_snapshots: RawSnapshot[];
}

interface RawLobbyPlayerRow {
  start_absolute_lp: number;
  start_wins: number;
  start_losses: number;
  player: RawPlayer | RawPlayer[] | null;
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

  if (error || !data) {
    console.error("Error fetching lobby players:", error);
    throw new Error("Failed to fetch lobby players");
  }

  const typedRows = data as unknown as RawLobbyPlayerRow[];

  return typedRows.map((row) => {
    const player = Array.isArray(row.player) ? row.player[0] : row.player;
    
    if (!player) {
      return {
        puuid: '',
        game_name: 'Desconocido',
        tag_line: '',
        profile_icon_id: null,
        start_absolute_lp: row.start_absolute_lp,
        current_absolute_lp: row.start_absolute_lp,
        delta: 0,
        tier: 'UNRANKED',
        division: '',
        lp: 0,
        wins: 0,
        losses: 0,
        winrate: 0,
        history: [{ date: 'Inicio', lp: row.start_absolute_lp }]
      };
    }

    const snapshots = (player.player_snapshots || []).slice().sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const latestSnapshot = snapshots[snapshots.length - 1];
    
    const currentTier = latestSnapshot?.tier || 'UNRANKED';
    const currentDivision = latestSnapshot?.division || '';
    const currentLp = latestSnapshot?.lp || 0;
    const currentWins = latestSnapshot?.total_wins ?? row.start_wins;
    const currentLosses = latestSnapshot?.total_losses ?? row.start_losses;

    const currentAbsoluteLp = calculateAbsoluteLP(currentTier, currentDivision, currentLp);
    const delta = currentAbsoluteLp - row.start_absolute_lp;
    
    const totalGames = currentWins + currentLosses;
    const winrate = totalGames > 0 ? Math.round((currentWins / totalGames) * 100) : 0;

    const history = snapshots.map((snap) => {
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
    .order('start_date', { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching all lobbies:", error);
    return [];
  }

  return data;
}

export async function updateLobby(id: string, data: { name?: string; end_date?: string }) {
  try {
    const user = await requireAuth();

    // Check ownership
    const { data: lobby, error: fetchError } = await supabaseAdmin
      .from('lobbies')
      .select('created_by, start_date')
      .eq('id', id)
      .single();

    if (fetchError || !lobby) {
      return { error: 'Sala no encontrada.' };
    }

    if (!lobby.created_by || lobby.created_by !== user.id) {
      return { error: 'No tienes permisos para modificar esta sala.' };
    }

    const updates: { name?: string; end_date?: string } = {};
    if (typeof data.name === 'string') {
      const trimmed = data.name.trim();
      if (!trimmed) {
        return { error: 'El nombre de la sala no puede estar vacío.' };
      }
      updates.name = trimmed;
    }

    if (data.end_date) {
      const newEndDate = new Date(data.end_date);
      if (isNaN(newEndDate.getTime())) {
        return { error: 'Fecha de término no válida.' };
      }
      if (new Date(lobby.start_date) >= newEndDate) {
        return { error: 'La fecha de término debe ser posterior a la fecha de inicio.' };
      }
      updates.end_date = newEndDate.toISOString();
    }

    const { error } = await supabaseAdmin
      .from('lobbies')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error("Error updating lobby:", error);
      return { error: 'Ocurrió un error al actualizar la sala.' };
    }

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      return { error: 'Debes iniciar sesión para modificar esta sala.' };
    }
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error("Error in updateLobby:", errMsg);
    return { error: 'Ocurrió un error al actualizar la sala.' };
  }
}

export async function deleteLobby(id: string) {
  try {
    const user = await requireAuth();

    // Check ownership
    const { data: lobby, error: fetchError } = await supabaseAdmin
      .from('lobbies')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !lobby) {
      return { error: 'Sala no encontrada.' };
    }

    if (!lobby.created_by || lobby.created_by !== user.id) {
      return { error: 'No tienes permisos para eliminar esta sala.' };
    }

    const { error } = await supabaseAdmin
      .from('lobbies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting lobby:", error);
      return { error: 'Ocurrió un error al eliminar la sala.' };
    }

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      return { error: 'Debes iniciar sesión para eliminar esta sala.' };
    }
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error("Error in deleteLobby:", errMsg);
    return { error: 'Ocurrió un error al eliminar la sala.' };
  }
}
