import { createClient } from '@supabase/supabase-js';
import { generateAgents } from './lib/agent-simulator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testSchema() {
  try {
    console.log('🤖 Generating tester agents...');
    const agents = generateAgents(5, 7); // 5 agents, 7 days of simulation

    console.log('👥 Inserting into public.players...');
    const { error: playersError } = await supabase
      .from('players')
      .upsert(agents.map(a => ({
        puuid: a.puuid,
        game_name: a.game_name,
        tag_line: a.tag_line
      })));

    if (playersError) throw new Error(`Players Error: ${playersError.message}`);

    console.log('🏟️ Creating a test lobby...');
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .insert({
        name: 'Tester Agents Lobby',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        settings: { test: true },
        active: true
      })
      .select('id')
      .single();

    if (lobbyError) throw new Error(`Lobby Error: ${lobbyError.message}`);

    console.log(`🔗 Linking agents to lobby in public.lobby_players (Lobby ID: ${lobby.id})...`);
    const { error: lobbyPlayersError } = await supabase
      .from('lobby_players')
      .insert(agents.map(a => ({
        lobby_id: lobby.id,
        player_puuid: a.puuid,
        start_absolute_lp: a.start_absolute_lp,
        start_wins: 0,
        start_losses: 0
      })));

    if (lobbyPlayersError) throw new Error(`LobbyPlayers Error: ${lobbyPlayersError.message}`);

    console.log('📸 Inserting history into public.player_snapshots...');
    const snapshots = [];
    for (const a of agents) {
      for (const h of a.history) {
        snapshots.push({
          player_puuid: a.puuid,
          tier: a.tier,
          division: a.division,
          lp: h.lp,
          total_wins: Math.floor(Math.random() * 100),
          total_losses: Math.floor(Math.random() * 100)
        });
      }
    }

    const { error: snapshotsError } = await supabase
      .from('player_snapshots')
      .insert(snapshots);

    if (snapshotsError) throw new Error(`Snapshots Error: ${snapshotsError.message}`);

    console.log('✅ Test finished successfully! Schema is fully operational.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSchema();
