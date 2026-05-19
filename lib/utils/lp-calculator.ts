/**
 * Utilidad matemática para calcular LPs absolutos.
 * Esto permite comparar el progreso entre distintos rangos de forma justa.
 */

const TIER_BASE_VALUES: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 3500, // Aproximación
  CHALLENGER: 4500,  // Aproximación
};

const DIVISION_VALUES: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

export function calculateAbsoluteLP(tier: string, division: string, lp: number): number {
  const upperTier = tier.toUpperCase();
  const upperDivision = division.toUpperCase();

  const baseTierLP = TIER_BASE_VALUES[upperTier] ?? 0;
  
  // Master+ ranks don't have divisions, they just stack LPs
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(upperTier)) {
      return baseTierLP + lp;
  }

  const baseDivisionLP = DIVISION_VALUES[upperDivision] ?? 0;

  return baseTierLP + baseDivisionLP + lp;
}
