"use server";

import { createClient } from '@supabase/supabase-js';
import { calculateAbsoluteLP, getPlayerFullData } from '@/lib/riot-api';
import { requireAuth } from '@/lib/auth';
import { admin, accessLobby, createInvite } from '@/lib/lobby-access';
import { competitionDates, competitionDelta, parseDuration, parsePlayerLimit } from '@/lib/competition';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function createLobby(formData: {
  name: string;
  durationDays: number;
  visibility: 'public' | 'private';
  onlyUnranked: boolean;
  maxPlayers: number;
}) {
  const user = await requireAuth();
  const name = (formData.name || '').trim();
  if (!name || name.length > 80) throw new Error('El nombre de la sala debe tener entre 1 y 80 caracteres.');
  const durationDays = parseDuration(formData.durationDays);
  const maxPlayers = parsePlayerLimit(formData.maxPlayers);
  if (!['public', 'private'].includes(formData.visibility)) throw new Error('Visibilidad inválida.');
  const dates = competitionDates(durationDays);
  const invite = formData.visibility === 'private' ? createInvite() : null;

  // Creation must succeed without Riot credentials: participants are added later.
  const { data, error } = await admin
    .from('lobbies')
    .insert({
      name,
      start_date: dates.startDate,
      end_date: dates.endDate,
      active: true,
      created_by: user.id,
      visibility: formData.visibility,
      invite_token_hash: invite?.hash || null,
      settings: { onlyUnranked: !!formData.onlyUnranked, maxPlayers, durationDays, queueId: 420, noPrizes: true },
    })
    .select('id').single();
  if (error || !data) {
    console.error('Error creating lobby:', error);
    throw new Error('No se pudo crear la sala. Comprueba la migración 007.');
  }
  return { id: data.id as string, inviteToken: invite?.token || null };
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
  joined_at: string | null;
  start_wins: number;
  start_losses: number;
  player: RawPlayer | RawPlayer[] | null;
}

export async function getLobbyPlayers(lobbyId: string, inviteToken?: string) {
  const access = await accessLobby(lobbyId, inviteToken);
  if (!access) throw new Error('Sala privada o no encontrada.');
  const { data, error } = await admin
    .from('lobby_players')
    .select(`
      start_absolute_lp,
      joined_at,
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

    const snapshots = (player.player_snapshots || [])
      .filter(snap => new Date(snap.created_at).getTime() >= new Date(row.joined_at || access.lobby.start_date).getTime())
      .slice().sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const latestSnapshot = snapshots[snapshots.length - 1];
    
    const currentTier = latestSnapshot?.tier || 'UNRANKED';
    const currentDivision = latestSnapshot?.division || '';
    const currentLp = latestSnapshot?.lp || 0;
    const currentWins = latestSnapshot?.total_wins ?? row.start_wins;
    const currentLosses = latestSnapshot?.total_losses ?? row.start_losses;

    const currentAbsoluteLp = calculateAbsoluteLP(currentTier, currentDivision, currentLp);
    const delta = competitionDelta(currentAbsoluteLp, row.start_absolute_lp);
    
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
    .eq('visibility', 'public')
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
    .eq('visibility', 'public')
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
      .select('created_by, start_date, end_date')
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
      return { error: 'La duración de la competición no se modifica una vez creada.' };
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


/** Changing a private invite invalidates all previously shared links. */
export async function rotateLobbyInvite(lobbyId: string) {
  const user = await requireAuth();
  const { data: lobby } = await admin.from('lobbies')
    .select('created_by, visibility').eq('id', lobbyId).maybeSingle();
  if (!lobby || lobby.created_by !== user.id || lobby.visibility !== 'private') {
    return { error: 'Solo el creador puede regenerar una invitación privada.' };
  }
  const invite = createInvite();
  const { error } = await admin.from('lobbies').update({ invite_token_hash: invite.hash }).eq('id', lobbyId);
  if (error) return { error: 'No se pudo crear la invitación.' };
  return { inviteToken: invite.token };
}
