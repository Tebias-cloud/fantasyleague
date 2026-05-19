export interface SimulatedPlayer {
  puuid: string;
  game_name: string;
  tag_line: string;
  start_absolute_lp: number;
  current_absolute_lp: number;
  delta: number;
  tier: string;
  division: string;
  lp: number;
  winrate: number;
  history: { date: string; lp: number }[];
}

const BOT_NAMES = [
  "YasuoMain", "TeemoOnetrick", "FakerWannabe", "ChovyFan", "Dopa", 
  "Tyler1", "Gosu", "Uzi", "ShowMaker", "Caps", 
  "Perkz", "Doublelift", "Bjergsen", "Rookie", "TheShy"
];

const BOT_TAGS = ["NA1", "EUW", "KR", "LAS", "BR1", "OCE"];

// Función inversa de cálculo de ELO
export function getTierFromAbsoluteLP(absLp: number): { tier: string; division: string; lp: number } {
  if (absLp < 0) return { tier: "IRON", division: "IV", lp: 0 };
  
  if (absLp >= 2800) {
    // Master, Grandmaster, Challenger (Simplificaremos a Master para la tabla)
    return { tier: "MASTER", division: "I", lp: absLp - 2800 };
  }

  const tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];
  const divisions = ["IV", "III", "II", "I"];
  
  const tierIndex = Math.min(Math.floor(absLp / 400), 6);
  const remainderLpInTier = absLp % 400;
  
  const divisionIndex = Math.floor(remainderLpInTier / 100);
  const remainingLp = remainderLpInTier % 100;

  return {
    tier: tiers[tierIndex],
    division: divisions[divisionIndex],
    lp: remainingLp
  };
}

export function generateAgents(count: number, days: number = 30): SimulatedPlayer[] {
  const agents: SimulatedPlayer[] = [];

  for (let i = 0; i < count; i++) {
    // Escoger nombre y tag aleatorio
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + Math.floor(Math.random() * 999);
    const tag = BOT_TAGS[Math.floor(Math.random() * BOT_TAGS.length)];
    
    // Rango inicial aleatorio entre Silver IV (800) y Diamond I (2799)
    const startAbsoluteLp = 800 + Math.floor(Math.random() * 2000);
    
    let currentAbsoluteLp = startAbsoluteLp;
    let totalWins = 0;
    let totalLosses = 0;
    
    const history: { date: string; lp: number }[] = [];
    
    // Máquina de estados para el comportamiento del jugador
    type PlayerState = 'NORMAL' | 'WINSTREAK' | 'LOSERS_QUEUE';
    let currentState: PlayerState = 'NORMAL';
    let daysInState = 0;

    for (let day = 1; day <= days; day++) {
      // Juegos por día (2 a 8)
      const gamesToday = 2 + Math.floor(Math.random() * 7);
      
      // Manejar transiciones de estado
      if (daysInState <= 0) {
        const rand = Math.random();
        if (rand < 0.2) {
          currentState = 'WINSTREAK';
          daysInState = 2 + Math.floor(Math.random() * 4); // 2-5 días de racha
        } else if (rand < 0.4) {
          currentState = 'LOSERS_QUEUE';
          daysInState = 2 + Math.floor(Math.random() * 3); // 2-4 días de tilteo
        } else {
          currentState = 'NORMAL';
          daysInState = 1 + Math.floor(Math.random() * 3); // 1-3 días normal
        }
      }
      daysInState--;

      // Determinar probabilidades base según el estado
      let winChance = 0.5;
      let lpGain = 20;
      let lpLoss = 20;

      if (currentState === 'WINSTREAK') {
        winChance = 0.75;
        lpGain = 25;
        lpLoss = 15;
      } else if (currentState === 'LOSERS_QUEUE') {
        winChance = 0.25;
        lpGain = 15;
        lpLoss = 25;
      }

      // Simular juegos del día
      for (let g = 0; g < gamesToday; g++) {
        if (Math.random() < winChance) {
          totalWins++;
          currentAbsoluteLp += lpGain + Math.floor(Math.random() * 5 - 2); // +-2 varianza
        } else {
          totalLosses++;
          currentAbsoluteLp -= lpLoss + Math.floor(Math.random() * 5 - 2); // +-2 varianza
          if (currentAbsoluteLp < 0) currentAbsoluteLp = 0;
        }
      }

      history.push({
        date: `Día ${day}`,
        lp: currentAbsoluteLp
      });
    }

    const { tier, division, lp } = getTierFromAbsoluteLP(currentAbsoluteLp);
    const winrate = Math.round((totalWins / (totalWins + totalLosses)) * 100);

    agents.push({
      puuid: `simulated-agent-${name}-${tag}-${Date.now()}`,
      game_name: name,
      tag_line: tag,
      start_absolute_lp: startAbsoluteLp,
      current_absolute_lp: currentAbsoluteLp,
      delta: currentAbsoluteLp - startAbsoluteLp,
      tier,
      division,
      lp,
      winrate,
      history
    });
  }

  return agents;
}
