import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

// Cargar variables de entorno del entorno local
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// ID de la sala que queremos arreglar
const LOBBY_ID = 'f866d378-fc12-4298-a494-1818b74215e5';

// Datos Realistas de Elos Altos (SoloQ Challenge)
const REALISTIC_PROS = [
  {
    puuid: 'V19nZk7MwtQ8QpQ6mFq12j-3yGqW3g8j_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1', // Faker (Hide on bush)
    game_name: 'Hide on bush',
    tag_line: 'KR1',
    tier: 'CHALLENGER',
    division: 'I',
    currentLp: 1954,
    startLp: 1810,
    startWins: 16,
    startLosses: 14,
    currentWins: 28,
    currentLosses: 22,
    historyLps: [1810, 1845, 1890, 1915, 1940, 1954] // 5 días de progreso
  },
  {
    puuid: 'V19nZk7MwtQ8QpQ6mFq12j-3yGqW3g8j_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j2', // JoseDeodo
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
    historyLps: [650, 680, 665, 690, 715, 720] // subió y bajó, pero terminó arriba
  },
  {
    puuid: 'V19nZk7MwtQ8QpQ6mFq12j-3yGqW3g8j_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j3', // Caps
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
    historyLps: [310, 290, 280, 260, 250, 240] // ¡TILT! Fue en picada hacia abajo
  },
  {
    puuid: 'V19nZk7MwtQ8QpQ6mFq12j-3yGqW3g8j_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j1_h1_j4', // Jojopyun
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
    historyLps: [10, 25, 45, 60, 75, 85] // Constante escalada
  }
];

// Cálculo de LP absoluto local
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
    console.log(`🏟️ Modificando el lobby ${LOBBY_ID} con estadísticas profesionales altamente realistas...`);

    // 1. Obtener los puuids de los jugadores reales que están actualmente en el lobby
    const { data: lpRow, error: fetchLpErr } = await supabase
      .from('lobby_players')
      .select('player_puuid, players(game_name)')
      .eq('lobby_id', LOBBY_ID);

    if (fetchLpErr || !lpRow) throw fetchLpErr;

    console.log('🔍 Encontrados jugadores en base de datos:');
    
    for (const row of lpRow) {
      const p = Array.isArray(row.players) ? row.players[0] : row.players;
      const matchingPro = REALISTIC_PROS.find(rp => rp.game_name.toLowerCase() === p.game_name.toLowerCase());
      
      if (!matchingPro) {
        console.log(`   - Saltando ${p.game_name} (no coincide con pro configurado)`);
        continue;
      }
      
      const puuid = row.player_puuid;
      console.log(`   ✏️ Actualizando ${p.game_name} (PUUID: ${puuid})`);

      // 2. Actualizar lobby_players
      const startingAbsLp = getAbsLp(matchingPro.tier, matchingPro.division, matchingPro.startLp);
      
      const { error: updateLpErr } = await supabase
        .from('lobby_players')
        .update({
          start_absolute_lp: startingAbsLp,
          start_wins: matchingPro.startWins,
          start_losses: matchingPro.startLosses
        })
        .eq('lobby_id', LOBBY_ID)
        .eq('player_puuid', puuid);

      if (updateLpErr) throw updateLpErr;

      // 3. Eliminar snapshots antiguos de este jugador
      await supabase
        .from('player_snapshots')
        .delete()
        .eq('player_puuid', puuid);

      // 4. Crear snapshots históricos realistas
      const snapshots = [];
      const totalDays = 5;
      
      for (let day = totalDays; day >= 0; day--) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        // Progreso de LP según la curva configurada en matchingPro.historyLps
        const index = totalDays - day;
        const currentLp = matchingPro.historyLps[index];
        
        // Simular victorias/derrotas parciales por día
        const daysPassed = totalDays - day;
        const totalWinsDiff = matchingPro.currentWins - matchingPro.startWins;
        const totalLossesDiff = matchingPro.currentLosses - matchingPro.startLosses;
        
        const winsAtDay = matchingPro.startWins + Math.round((totalWinsDiff / totalDays) * daysPassed);
        const lossesAtDay = matchingPro.startLosses + Math.round((totalLossesDiff / totalDays) * daysPassed);

        snapshots.push({
          player_puuid: puuid,
          tier: matchingPro.tier,
          division: matchingPro.division,
          lp: currentLp,
          total_wins: winsAtDay,
          total_losses: lossesAtDay,
          created_at: date.toISOString()
        });
      }

      const { error: snapInsertErr } = await supabase
        .from('player_snapshots')
        .insert(snapshots);

      if (snapInsertErr) throw snapInsertErr;
      console.log(`   ✅ Historial de snapshots y estadísticas guardados para ${p.game_name}.`);
    }

    console.log('\n=========================================');
    console.log('✅ ¡SALA DE PRUEBA ACTUALIZADA CON ÉXITO!');
    console.log(`Los jugadores ahora tienen rangos de Challenger/Grandmaster/Master/Diamond.`);
    console.log(`Los contadores de victorias y derrotas ahora son 100% realistas y el gráfico tiene curvas reales.`);
    console.log('=========================================');

  } catch (error: any) {
    console.error('❌ Error al poblar estadísticas realistas:', error.message || error);
  }
}

run();
