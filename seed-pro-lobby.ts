import { loadEnvConfig } from '@next/env';
// Cargar variables de entorno del entorno local
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';

// Evitar hoisting usando require después de cargar el entorno
const { getPlayerFullData } = require('./lib/riot-api');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Summoners Reales y Muy Activos de Diferentes Regiones
const PROS = [
  { gameName: 'Hide on bush', tagLine: 'KR1' },    // Faker
  { gameName: 'ShowMaker', tagLine: 'DK1' },       // ShowMaker
  { gameName: 'G2 Caps', tagLine: 'EUW' },         // Caps
  { gameName: 'C9 Jojopyun', tagLine: 'NA1' },     // Jojopyun
  { gameName: 'JoseDeodo', tagLine: 'LAS' }        // Josedeodo
];

async function seedProLobby() {
  try {
    console.log('🌟 Conectando con Riot Games API para obtener summoners reales...');
    const activePlayers = [];

    for (const pro of PROS) {
      try {
        console.log(`🔍 Consultando: ${pro.gameName}#${pro.tagLine}...`);
        const data = await getPlayerFullData(pro.gameName, pro.tagLine);
        activePlayers.push(data);
        console.log(`   ✅ Encontrado: ${data.game_name}#${data.tag_line} - ${data.tier} ${data.division} (${data.lp} LP)`);
        // Espera de 1 segundo para evitar límites de la API de Riot (Rate Limit)
        await new Promise(res => setTimeout(res, 1000));
      } catch (err: any) {
        console.error(`   ❌ No se pudo cargar a ${pro.gameName}#${pro.tagLine}:`, err.message);
      }
    }

    if (activePlayers.length === 0) {
      throw new Error('No se pudo obtener información de ningún jugador real de Riot.');
    }

    console.log(`\n👥 Registrando ${activePlayers.length} jugadores en la tabla public.players...`);
    const { error: playersError } = await supabase
      .from('players')
      .upsert(activePlayers.map(p => ({
        puuid: p.puuid,
        game_name: p.game_name,
        tag_line: p.tag_line,
        profile_icon_id: p.profile_icon_id
      })));

    if (playersError) throw new Error(`Error en tabla players: ${playersError.message}`);

    console.log('🏟️ Creando la sala de prueba: "SoloQ Pro Showcase"...');
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días de duración

    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .insert({
        name: 'SoloQ Pro Showcase',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        settings: { pro_showcase: true },
        active: true
      })
      .select('id')
      .single();

    if (lobbyError) throw new Error(`Error al crear la sala: ${lobbyError.message}`);
    console.log(`🎉 Sala creada exitosamente con ID: ${lobby.id}`);

    console.log('🔗 Vinculando los jugadores a la sala...');
    const { error: lobbyPlayersError } = await supabase
      .from('lobby_players')
      .insert(activePlayers.map(p => {
        // Su LP inicial de hace 5 días (simulado restando un aproximado de 100 LP de su LP actual)
        const startingLp = Math.max(0, p.current_absolute_lp - 100);
        return {
          lobby_id: lobby.id,
          player_puuid: p.puuid,
          start_absolute_lp: startingLp,
          start_wins: Math.max(0, p.wins - 6),
          start_losses: Math.max(0, p.losses - 6)
        };
      }));

    if (lobbyPlayersError) throw new Error(`Error vinculando jugadores: ${lobbyPlayersError.message}`);

    console.log('📸 Generando historial diario (snapshots) para ver las curvas en el gráfico...');
    const snapshotsList = [];
    
    // Generar 5 días de historial diario
    const totalDays = 5;
    for (const p of activePlayers) {
      let currentLp = p.lp;
      let wins = p.wins;
      let losses = p.losses;
      
      for (let day = totalDays; day >= 0; day--) {
        const snapshotDate = new Date();
        snapshotDate.setDate(snapshotDate.getDate() - day);
        
        // Simular progreso diario hacia su LP real de hoy
        if (day > 0) {
          const lpChange = Math.floor(Math.random() * 45) - 20; // variaciones de -20 a +25 LP diarios
          currentLp = Math.max(0, currentLp + lpChange);
          if (Math.random() > 0.5) wins += 1; else losses += 1;
        } else {
          // El día de hoy tiene su elo real exacto
          currentLp = p.lp;
          wins = p.wins;
          losses = p.losses;
        }

        snapshotsList.push({
          player_puuid: p.puuid,
          tier: p.tier,
          division: p.division,
          lp: currentLp,
          total_wins: wins,
          total_losses: losses,
          created_at: snapshotDate.toISOString()
        });
      }
    }

    console.log(`💾 Guardando ${snapshotsList.length} snapshots en public.player_snapshots...`);
    const { error: snapshotsError } = await supabase
      .from('player_snapshots')
      .insert(snapshotsList);

    if (snapshotsError) throw new Error(`Error guardando snapshots: ${snapshotsError.message}`);

    console.log('\n=========================================');
    console.log('✅ ¡SALA DE PRUEBA CREADA EXITOSAMENTE!');
    console.log(`ID de la Sala: ${lobby.id}`);
    console.log(`URL para entrar: http://localhost:3000/lobbies/${lobby.id}`);
    console.log('=========================================');

  } catch (error: any) {
    console.error('❌ Falló la creación de la sala de prueba:', error.message || error);
  }
}

seedProLobby();
