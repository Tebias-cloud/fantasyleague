/**
 * Riot Games API Implementation
 * Flow: Account-V1 (PUUID) -> Summoner-V4 (SummonerID) -> League-V4 (Rank Info)
 */

function getRiotApiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    throw new RiotApiError('RIOT_API_KEY is not defined in environment variables.', 500);
  }
  return key;
}

export class RiotApiError extends Error {
  status?: number;
  retryAfter?: number;

  constructor(message: string, status?: number, retryAfter?: number) {
    super(message);
    this.name = 'RiotApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export interface LeagueInfo {
  game_name: string;
  tag_line: string;
  puuid: string;
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  winrate: number;
  current_absolute_lp: number;
  profile_icon_id: number;
}

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  profileIconId: number;
}

interface RiotLeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

interface RiotMatchParticipant {
  puuid: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  win: boolean;
  championName: string;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  riotIdGameName?: string;
  summonerName?: string;
  riotIdTagline?: string;
}

interface RiotMatchDetail {
  info: {
    gameMode: string;
    gameCreation: number;
    gameDuration: number;
    participants: RiotMatchParticipant[];
  };
}

/**
 * Normaliza el rango a un valor numérico lineal para comparaciones.
 */
export function calculateAbsoluteLP(tier: string, division: string, lp: number): number {
  const tierValues: Record<string, number> = {
    'IRON': 0,
    'BRONZE': 400,
    'SILVER': 800,
    'GOLD': 1200,
    'PLATINUM': 1600,
    'EMERALD': 2000,
    'DIAMOND': 2400,
    'MASTER': 2800,
    'GRANDMASTER': 2800,
    'CHALLENGER': 2800,
  };

  const divisionValues: Record<string, number> = {
    'IV': 0,
    'III': 100,
    'II': 200,
    'I': 300,
  };

  const baseTier = tierValues[(tier || '').toUpperCase()] || 0;
  
  // Master+ no tienen divisiones en la API de la misma forma (siempre suelen devolver I o vacio)
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes((tier || '').toUpperCase())) {
    return baseTier + lp;
  }

  const baseDivision = divisionValues[(division || '').toUpperCase()] || 0;
  return baseTier + baseDivision + lp;
}

async function riotFetch<T>(url: string): Promise<T> {
  const apiKey = getRiotApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

      if (response.status === 400) {
        throw new RiotApiError('BadRequest', 400);
      }
      if (response.status === 401 || response.status === 403) {
        throw new RiotApiError('Forbidden: API Key might be expired or invalid', response.status);
      }
      if (response.status === 404) {
        throw new RiotApiError('NotFound', 404);
      }
      if (response.status === 429) {
        throw new RiotApiError('RateLimit', 429, retryAfter);
      }
      if (response.status >= 500) {
        throw new RiotApiError('RiotServerError', response.status);
      }
      throw new RiotApiError(`Riot API Error: ${response.status}`, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new RiotApiError('Invalid JSON response from Riot API', response.status);
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof RiotApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RiotApiError('Timeout: Riot API request took too long', 408);
    }
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new RiotApiError(message);
  }
}

export function getRouteByTag(tagLine: string): { region: string; platform: string } {
  const tag = (tagLine || '').toUpperCase().trim();
  
  // Default to LAS
  let region = 'americas';
  let platform = 'la2';
  
  if (['EUW', 'EUW1', 'EUNE', 'EUN1', 'TR', 'RU'].some(t => tag.includes(t))) {
    region = 'europe';
    platform = tag.includes('EUN') ? 'eun1' : tag.includes('TR') ? 'tr1' : tag.includes('RU') ? 'ru' : 'euw1';
  } else if (['KR', 'KR1', 'JP', 'JP1'].some(t => tag.includes(t))) {
    region = 'asia';
    platform = tag.includes('JP') ? 'jp1' : 'kr';
  } else if (['NA', 'NA1', 'LAN', 'LA1', 'LAS', 'LA2', 'BR', 'BR1'].some(t => tag.includes(t))) {
    region = 'americas';
    if (tag.includes('NA')) platform = 'na1';
    else if (tag.includes('LAN') || tag.includes('LA1')) platform = 'la1';
    else if (tag.includes('LAS') || tag.includes('LA2')) platform = 'la2';
    else if (tag.includes('BR')) platform = 'br1';
  } else if (['OCE', 'OC1', 'PH', 'SG', 'TH', 'TW', 'VN'].some(t => tag.includes(t))) {
    region = 'sea';
    if (tag.includes('OCE') || tag.includes('OC1')) platform = 'oc1';
    else if (tag.includes('PH')) platform = 'ph2';
    else if (tag.includes('SG')) platform = 'sg2';
    else if (tag.includes('TH')) platform = 'th2';
    else if (tag.includes('TW')) platform = 'tw2';
    else if (tag.includes('VN')) platform = 'vn2';
  }
  
  return { region, platform };
}

export async function getPlayerFullData(gameName: string, tagLine: string): Promise<LeagueInfo> {
  const { region, platform } = getRouteByTag(tagLine);
  try {
    // Paso 1: Account-V1 (Obtener PUUID)
    const accountUrl = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const accountData = await riotFetch<RiotAccount>(accountUrl);
    const puuid = accountData.puuid;

    // Paso 2: Summoner-V4 (Obtener Profile Icon)
    const summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const summonerData = await riotFetch<RiotSummoner>(summonerUrl);
    const profileIconId = summonerData.profileIconId;

    // Paso 3: League-V4 (Obtener info de SoloQ por PUUID)
    const leagueUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    const leagueEntries = await riotFetch<RiotLeagueEntry[]>(leagueUrl);

    // Buscar SoloQ (RANKED_SOLO_5x5)
    const soloQ = leagueEntries.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');

    if (!soloQ) {
      // Si no tiene SoloQ, devolvemos un estado Unranked básico
      return {
        game_name: accountData.gameName,
        tag_line: accountData.tagLine,
        puuid: puuid,
        tier: 'UNRANKED',
        division: '',
        lp: 0,
        wins: 0,
        losses: 0,
        winrate: 0,
        current_absolute_lp: 0,
        profile_icon_id: profileIconId,
      };
    }

    const wins = soloQ.wins;
    const losses = soloQ.losses;
    const winrate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const absLp = calculateAbsoluteLP(soloQ.tier, soloQ.rank, soloQ.leaguePoints);

    return {
      game_name: accountData.gameName,
      tag_line: accountData.tagLine,
      puuid: puuid,
      tier: soloQ.tier,
      division: soloQ.rank,
      lp: soloQ.leaguePoints,
      wins,
      losses,
      winrate,
      current_absolute_lp: absLp,
      profile_icon_id: profileIconId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Riot API] Error fetching data for ${gameName}#${tagLine}:`, message);
    throw error;
  }
}

export interface ParticipantMatchInfo {
  gameName: string;
  tagLine: string;
  championName: string;
  puuid: string;
  isCurrent: boolean;
}

export interface MatchInfo {
  matchId: string;
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  gameMode: string;
  gameCreation: number;
  gameDuration: number; // en segundos
  cs: number;
  items: number[];
  participants: ParticipantMatchInfo[];
}

export async function getPlayerRecentMatches(puuid: string, tagLine: string = 'LAS'): Promise<MatchInfo[]> {
  const { region } = getRouteByTag(tagLine);
  try {
    // Obtener los últimos 5 IDs de partidas
    const matchesUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`;
    const matchIds = await riotFetch<string[]>(matchesUrl);

    const matchPromises = matchIds.map(async (matchId) => {
      try {
        const detailUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        const matchDetail = await riotFetch<RiotMatchDetail>(detailUrl);
        
        // Buscar el participante que corresponda a nuestro PUUID
        const participant = matchDetail.info.participants.find(
          (p) => p.puuid === puuid
        );

        if (!participant) return null;

        const kills = participant.kills;
        const deaths = participant.deaths;
        const assists = participant.assists;
        const kda = deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(2);
        
        const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;
        const items = [
          participant.item0,
          participant.item1,
          participant.item2,
          participant.item3,
          participant.item4,
          participant.item5,
          participant.item6
        ];

        const participants: ParticipantMatchInfo[] = matchDetail.info.participants.map((p) => ({
          gameName: p.riotIdGameName || p.summonerName || '',
          tagLine: p.riotIdTagline || '',
          championName: p.championName,
          puuid: p.puuid,
          isCurrent: p.puuid === puuid
        }));

        return {
          matchId,
          win: participant.win,
          championName: participant.championName,
          kills,
          deaths,
          assists,
          kda,
          gameMode: matchDetail.info.gameMode,
          gameCreation: matchDetail.info.gameCreation,
          gameDuration: matchDetail.info.gameDuration,
          cs,
          items,
          participants
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error fetching match detail for ${matchId}:`, errMsg);
        return null;
      }
    });

    const results = await Promise.all(matchPromises);
    return results.filter((m): m is MatchInfo => m !== null);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Riot API] Error fetching matches for ${puuid}:`, message);
    return [];
  }
}
