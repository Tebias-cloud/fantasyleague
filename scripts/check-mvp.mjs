import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const form = read('components/CreateLobbyForm.tsx');
const actions = read('app/actions/lobby-actions.ts');
const rank = read('components/LeaderboardTable.tsx');
const api = read('lib/riot-api.ts');
const policy = read('lib/riot-policy.ts');
const migration = read('supabase/migrations/007_mvp_private_lobbies.sql');
const demo = read('components/DemoCompetition.tsx');

assert.match(form, /LOBBY_DURATIONS/);
assert.match(form, /visibility/);
assert.match(actions, /parsePlayerLimit/);
assert.match(actions, /parseDuration/);
assert.match(rank, /sort\(\(a, b\) => b\.delta - a\.delta/);
assert.match(api, /getRouteByPlatform/);
assert.doesNotMatch(api, /getRouteByTag/);
assert.match(api, /queueId !== 420/);
assert.match(policy, /NODE_ENV/);
assert.match(policy, /RIOT_PRODUCTION_APPROVED/);
assert.match(migration, /invite_token_hash/);
assert.match(read('supabase/migrations/008_lobby_scoped_snapshots.sql'), /CREATE TABLE IF NOT EXISTS public.lobby_player_snapshots/);
assert.match(migration, /CREATE POLICY "Leer lobbies públicos o propios"/);
assert.match(demo, /DATOS FICTICIOS/);
console.log('MVP invariants: OK');
