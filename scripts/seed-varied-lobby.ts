import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

// Cargar variables de entorno locales
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// 10 Jugadores ficticios y reales muy variados para estrés del sistema
const VARIED_PLAYERS = [
  {
    puuid: 'p-challenger-faker-kr',
    game_name: 'Hide on bush',
    tag_line: 'KR1',
    tier: 'CHALLENGER',
    division: 'I',
    currentLp: 1954,
    startLp: 1810,
    startWins: 30,
    startLosses: 20,
    currentWins: 42,
    currentLosses: 28,
    historyLps: [1810, 1845, 1890, 1915, 1940, 1954], // EN RACHA 🔥
    profile_icon_id: 1250
  },
  {
    puuid: 'p-grandmaster-josedeodo',
    game_name: 'Josedeódo',
    tag_line: 'LAS',
    tier: 'GRANDMASTER',
    division: 'I',
    currentLp: 720,
    startLp: 650,
    startWins: 42,
    startLosses: 38,
    currentWins: 51,
    currentLosses: 44,
    historyLps: [650, 680, 665, 690, 715, 720], // TRYHARD 🧗
    profile_icon_id: 3450
  },
  {
    puuid: 'p-master-caps-euw',
    game_name: 'G2 Cåps',
    tag_line: 'EUW',
    tier: 'MASTER',
    division: 'I',
    currentLp: 240,
    startLp: 310,
    startWins: 55,
    startLosses: 45,
    currentWins: 60,
    currentLosses: 56,
    historyLps: [310, 290, 280, 260, 250, 240], // TILTEADO ❄️
    profile_icon_id: 2043
  },
  {
    puuid: 'p-diamond-jojopyun',
    game_name: 'C9 jojopyun',
    tag_line: 'NA1',
    tier: 'DIAMOND',
    division: 'II',
    currentLp: 85,
    startLp: 10,
    startWins: 20,
    startLosses: 20,
    currentWins: 35,
    currentLosses: 29,
    historyLps: [10, 25, 45, 60, 75, 85], // EN RACHA 🔥
    profile_icon_id: 588
  },
  {
    puuid: 'p-emerald-snaker',
    game_name: 'Snaker',
    tag_line: 'LAS',
    tier: 'EMERALD',
    division: 'I',
    currentLp: 90,
    startLp: 185,
    startWins: 30,
    startLosses: 25,
    currentWins: 34,
    currentLosses: 38,
    historyLps: [185, 170, 150, 120, 100, 90], // TILTEADO ❄️
    profile_icon_id: 4210
  },
  {
    puuid: 'p-platinum-plugo',
    game_name: 'Plugo',
    tag_line: 'LAS',
    tier: 'PLATINUM',
    division: 'II',
    currentLp: 45,
    startLp: 50,
    startWins: 15,
    startLosses: 15,
    currentWins: 20,
    currentLosses: 21,
    historyLps: [50, 65, 80, 70, 55, 45], // ESTABLE
    profile_icon_id: 4890
  },
  {
    puuid: 'p-gold-slayer',
    game_name: 'Slayer',
    tag_line: 'LAS',
    tier: 'GOLD',
    division: 'I',
    currentLp: 95,
    startLp: 10,
    startWins: 10,
    startLosses: 10,
    currentWins: 22,
    currentLosses: 14,
    historyLps: [10, 25, 45, 60, 80, 95], // TRYHARD 🧗
    profile_icon_id: 601
  },
  {
    puuid: 'p-silver-aloned',
    game_name: 'Aloned',
    tag_line: 'LAS',
    tier: 'SILVER',
    division: 'III',
    currentLp: 30,
    startLp: 20,
    startWins: 8,
    startLosses: 8,
    currentWins: 12,
    currentLosses: 12,
    historyLps: [20, 25, 15, 10, 25, 30], // ESTABLE
    profile_icon_id: 1114
  },
  {
    puuid: 'p-bronze-whynot',
    game_name: 'Whynot',
    tag_line: 'LAS',
    tier: 'BRONZE',
    division: 'I',
    currentLp: 80,
    startLp: 10,
    startWins: 4,
    startLosses: 4,
    currentWins: 14,
    currentLosses: 8,
    historyLps: [10, 30, 45, 55, 70, 80], // TRYHARD 🧗
    profile_icon_id: 991
  },
  {
    puuid: 'p-iron-slow',
    game_name: 'Slow',
    tag_line: 'LAS',
    tier: 'IRON',
    division: 'II',
    currentLp: 15,
    startLp: 95,
    startWins: 20,
    startLosses: 20,
    currentWins: 22,
    currentLosses: 34,
    historyLps: [95, 80, 60, 45, 30, 15], // TILTEADO ❄️
    profile_icon_id: 502
  }
];

function getAbsLp(tier: string, division: string, lp: number): number {
  const tierValues: Record<string, number> = {
    'IRON': 0, 'BRONZE': 400, 'SILVER': 800, 'GOLD': 1200, 'PLATINUM': 1600,
    'EMERALD': 2000, 'DIAMOND': 2400, 'MASTER': 2800, 'GRANDMASTER': 2800, 'CHALLENGER': 2800
  };
  const divisionValues: Record<string, number> = { 'IV': 0, 'III': 100, 'II': 200, 'I': 300 };

  const baseTier = tierValues[tier.toUpperCase()] || 0;
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier.toUpperCase())) {
    return baseTier + lp;
  }
  const baseDivision = divisionValues[division.toUpperCase()] || 0;
  return baseTier + baseDivision + lp;
}

async function run() {
  try {
    console.log('🏟️ Creando una nueva sala multidivisión para 10 invocadores...');
    
    // 1. Registrar jugadores en players table
    const { error: playersErr } = await supabase
      .from('players')
      .upsert(VARIED_PLAYERS.map(p => ({
        puuid: p.puuid,
        game_name: p.game_name,
        tag_line: p.tag_line,
        profile_icon_id: p.profile_icon_id
      })));

    if (playersErr) throw playersErr;
    console.log('   ✅ 10 Jugadores registrados en players.');

    // 2. Crear una nueva sala: "Gran Desafío Multidivisión"
    const startDate = new Date();
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 días
    
    const { data: lobby, error: lobbyErr } = await supabase
      .from('lobbies')
      .insert({
        name: 'Gran Desafío Multidivisión ⚔️',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        settings: { varied_showcase: true },
        active: true
      })
      .select('id')
      .single();

    if (lobbyErr) throw lobbyErr;
    console.log(`   ✅ Sala creada con ID: ${lobby.id}`);

    // 3. Vincular los 10 jugadores a la sala
    const { error: lpErr } = await supabase
      .from('lobby_players')
      .insert(VARIED_PLAYERS.map(p => {
        const startingAbsLp = getAbsLp(p.tier, p.division, p.startLp);
        return {
          lobby_id: lobby.id,
          player_puuid: p.puuid,
          start_absolute_lp: startingAbsLp,
          start_wins: p.startWins,
          start_losses: p.startLosses
        };
      }));

    if (lpErr) throw lpErr;
    console.log('   ✅ 10 Jugadores vinculados a la sala en lobby_players.');

    // 4. Crear snapshots para los últimos 5 días
    const snapshotsList = [];
    const totalDays = 5;

    for (const p of VARIED_PLAYERS) {
      const totalWinsDiff = p.currentWins - p.startWins;
      const totalLossesDiff = p.currentLosses - p.startLosses;

      for (let day = totalDays; day >= 0; day--) {
        const date = new Date();
        date.setDate(date.getDate() - day);

        const index = totalDays - day;
        const currentLp = p.historyLps[index];

        const daysPassed = totalDays - day;
        const winsAtDay = p.startWins + Math.round((totalWinsDiff / totalDays) * daysPassed);
        const lossesAtDay = p.startLosses + Math.round((totalLossesDiff / totalDays) * daysPassed);

        snapshotsList.push({
          player_puuid: p.puuid,
          tier: p.tier,
          division: p.division,
          lp: currentLp,
          total_wins: winsAtDay,
          total_losses: lossesAtDay,
          created_at: date.toISOString()
        });
      }
    }

    const { error: snapErr } = await supabase
      .from('player_snapshots')
      .insert(snapshotsList);

    if (snapErr) throw snapErr;
    console.log(`   ✅ Guardados ${snapshotsList.length} snapshots en base de datos.`);

    console.log('\n=========================================');
    console.log('🎉 ¡SALA MULTIDIVISIÓN CREADA EXITOSAMENTE!');
    console.log(`ID de la Sala: ${lobby.id}`);
    console.log(`URL en tu navegador: http://localhost:3000/lobbies/${lobby.id}`);
    console.log('=========================================');

  } catch (error: any) {
    console.error('❌ Error al poblar sala multidivisión:', error.message || error);
  }
}

run();
