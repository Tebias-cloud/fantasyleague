export const MOCK_LOBBY = {
  id: 'lobby-123',
  name: 'Tryhards del Fin de Semana',
  start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
  settings: {
    is_premium: false,
    max_players: 10,
    required_rank: null,
    only_unranked_accounts: false,
    auto_refresh: true,
  },
  active: true,
};

export const MOCK_PLAYERS = [
  {
    puuid: 'p1',
    game_name: 'Faker',
    tag_line: 'KR1',
    start_absolute_lp: 1250, // Gold IV 50 LP
    current_absolute_lp: 1400, // Gold II 0 LP
    delta: 150,
    tier: 'GOLD',
    division: 'II',
    lp: 0,
    winrate: 65,
    history: [
      { date: 'Día 1', lp: 1250 },
      { date: 'Día 2', lp: 1300 },
      { date: 'Día 3', lp: 1280 },
      { date: 'Hoy', lp: 1400 },
    ]
  },
  {
    puuid: 'p2',
    game_name: 'Chovy',
    tag_line: 'MID',
    start_absolute_lp: 2000, // Emerald IV 0 LP
    current_absolute_lp: 1950, // Platinum I 50 LP
    delta: -50,
    tier: 'PLATINUM',
    division: 'I',
    lp: 50,
    winrate: 45,
    history: [
      { date: 'Día 1', lp: 2000 },
      { date: 'Día 2', lp: 1950 },
      { date: 'Día 3', lp: 1900 },
      { date: 'Hoy', lp: 1950 },
    ]
  },
  {
    puuid: 'p3',
    game_name: 'Tyler1',
    tag_line: 'NA1',
    start_absolute_lp: 2800, // Master 0 LP
    current_absolute_lp: 3100, // Master 300 LP
    delta: 300,
    tier: 'MASTER',
    division: 'I',
    lp: 300,
    winrate: 58,
    history: [
      { date: 'Día 1', lp: 2800 },
      { date: 'Día 2', lp: 2950 },
      { date: 'Día 3', lp: 2900 },
      { date: 'Hoy', lp: 3100 },
    ]
  }
];
