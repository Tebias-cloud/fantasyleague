/**
 * Competitive SoloQ rules for the application MVP.
 * The Riot ID tagline is NOT a reliable indicator of the server.
 */
export const PLATFORM_ROUTES = {
  br1: 'americas', la1: 'americas', la2: 'americas', na1: 'americas',
  euw1: 'europe', eun1: 'europe', tr1: 'europe', ru: 'europe', me1: 'europe',
  kr: 'asia', jp1: 'asia',
  oc1: 'sea', sg2: 'sea', tw2: 'sea', vn2: 'sea',
} as const;

export type RiotPlatform = keyof typeof PLATFORM_ROUTES;
export const PLATFORM_OPTIONS: { value: RiotPlatform; label: string }[] = [
  { value: 'la2', label: 'LAS' }, { value: 'la1', label: 'LAN' },
  { value: 'br1', label: 'Brasil' }, { value: 'na1', label: 'NA' },
  { value: 'euw1', label: 'EUW' }, { value: 'eun1', label: 'EUNE' },
  { value: 'tr1', label: 'Turquía' }, { value: 'ru', label: 'Rusia' },
  { value: 'me1', label: 'Oriente Medio (validar con Riot)' },
  { value: 'kr', label: 'Corea' }, { value: 'jp1', label: 'Japón' },
  { value: 'oc1', label: 'Oceanía' },
  { value: 'sg2', label: 'Singapur (incl. PH/TH)' },
  { value: 'tw2', label: 'Taiwán' }, { value: 'vn2', label: 'Vietnam' },
];

export const LOBBY_DURATIONS = [7, 14, 30] as const;
export type LobbyDuration = typeof LOBBY_DURATIONS[number];
export type LobbyVisibility = 'public' | 'private';
export const MAX_LOBBY_PLAYERS = 20;

export function isRiotPlatform(value: string): value is RiotPlatform {
  return Object.prototype.hasOwnProperty.call(PLATFORM_ROUTES, value);
}

export function getRiotRegion(platform: string): string {
  if (!isRiotPlatform(platform)) throw new Error('Servidor de Riot no válido.');
  return PLATFORM_ROUTES[platform];
}

export function parseDuration(value: unknown): LobbyDuration {
  const duration = Number(value);
  if (duration !== 7 && duration !== 14 && duration !== 30) {
    throw new Error('La duración debe ser 7, 14 o 30 días.');
  }
  return duration;
}

export function parsePlayerLimit(value: unknown): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 2 || limit > MAX_LOBBY_PLAYERS) {
    throw new Error('Una sala admite entre 2 y 20 participantes.');
  }
  return limit;
}

export function competitionDates(durationDays: LobbyDuration, now = new Date()) {
  const start = new Date(now);
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function normalizeRiotId(gameName: string, tagLine: string) {
  const name = (gameName || '').trim();
  const tag = (tagLine || '').trim().replace(/^#/, '');
  if (!name || !tag || name.length > 24 || tag.length > 8 || name.includes('#') || tag.includes('#')) {
    throw new Error('Riot ID inválido. Usa Nombre y TAG por separado.');
  }
  return { gameName: name, tagLine: tag };
}

/** Snapshot delta. Baseline is fixed for the lifetime of a lobby. */
export function competitionDelta(currentAbsoluteLP: number, startAbsoluteLP: number): number {
  return currentAbsoluteLP - startAbsoluteLP;
}
