import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from './auth';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
export const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

export function createInvite() {
  const token = randomBytes(24).toString('hex');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
}

export function validInvite(token: string | undefined, hash: string | null): boolean {
  if (!token || !hash || !/^[a-f0-9]{48}$/.test(token)) return false;
  const a = Buffer.from(createHash('sha256').update(token).digest('hex'), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function accessLobby(lobbyId: string, inviteToken?: string) {
  const { data: lobby, error } = await admin
    .from('lobbies')
    .select('id, name, created_by, visibility, invite_token_hash, start_date, end_date, active, settings')
    .eq('id', lobbyId).maybeSingle();
  if (error || !lobby) return null;
  const user = await getAuthUser();
  const isOwner = Boolean(user?.id && lobby.created_by === user.id);
  const invited = validInvite(inviteToken, lobby.invite_token_hash);
  if (lobby.visibility === 'private' && !isOwner && !invited) return null;
  return { lobby, user, isOwner, invited };
}
