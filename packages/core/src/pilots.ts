import type { RosterEntry } from './models.js';

// Rows = Gunnery (0-8), Columns = Piloting (0-8)
// Source: BattleTech TechManual 2022, p.315
const BV_SKILL_MULTIPLIER: number[][] = [
  // P:  0     1     2     3     4     5     6     7     8
  [2.42, 2.31, 2.21, 2.10, 1.93, 1.75, 1.68, 1.59, 1.50], // G0
  [2.21, 2.11, 2.02, 1.92, 1.76, 1.60, 1.54, 1.46, 1.38], // G1
  [1.93, 1.85, 1.76, 1.68, 1.54, 1.40, 1.35, 1.28, 1.21], // G2
  [1.66, 1.58, 1.51, 1.44, 1.32, 1.20, 1.16, 1.10, 1.04], // G3
  [1.38, 1.32, 1.26, 1.20, 1.10, 1.00, 0.95, 0.90, 0.85], // G4
  [1.31, 1.19, 1.13, 1.08, 0.99, 0.90, 0.86, 0.81, 0.77], // G5
  [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72], // G6
  [1.17, 1.06, 1.01, 0.96, 0.88, 0.80, 0.76, 0.72, 0.68], // G7
  [1.10, 0.99, 0.95, 0.90, 0.83, 0.75, 0.71, 0.68, 0.64], // G8
];

const MIN_SKILL = 2;

const BASELINE_SKILLS: Record<string, [number, number]> = {
  inner_sphere: [4, 5],
  clan: [3, 4],
  mixed: [4, 5],
  primitive: [4, 5],
};
const DEFAULT_SKILL: [number, number] = [4, 5];

const GUNNERY_PRIORITY_ROLES = new Set(['Sniper', 'Missile Boat', 'Juggernaut']);
const PILOTING_PRIORITY_ROLES = new Set(['Striker', 'Skirmisher', 'Brawler', 'Scout']);

export function getMultiplier(gunnery: number, piloting: number): number {
  const g = Math.max(0, Math.min(8, gunnery));
  const p = Math.max(0, Math.min(8, piloting));
  return BV_SKILL_MULTIPLIER[g][p];
}

export function adjustedBv(baseBv: number, gunnery: number, piloting: number): number {
  return Math.round(baseBv * getMultiplier(gunnery, piloting));
}

export function baselineForTechBase(techBase: string): [number, number] {
  return BASELINE_SKILLS[techBase.toLowerCase()] ?? DEFAULT_SKILL;
}

export function assignPilotsAuto(entries: RosterEntry[], bvBudget: number): void {
  // Set baseline skills per unit's tech base
  for (const entry of entries) {
    const [g, p] = baselineForTechBase(entry.unit.techBase);
    entry.gunnery = g;
    entry.piloting = p;
    entry.adjustedBv = adjustedBv(entry.unit.bv, g, p);
  }

  // Greedily upgrade pilot skills to spend remaining BV
  while (true) {
    const currentTotal = entries.reduce((sum, e) => sum + e.adjustedBv, 0);
    const remaining = bvBudget - currentTotal;
    if (remaining <= 0) break;

    let bestEntry: RosterEntry | null = null;
    let bestScore = Infinity;
    let bestSkill: 'gunnery' | 'piloting' = 'gunnery';

    for (const entry of entries) {
      const role = entry.unit.role ?? '';

      for (const skill of ['gunnery', 'piloting'] as const) {
        let newG: number, newP: number, priority: number;
        if (skill === 'gunnery') {
          newG = entry.gunnery - 1;
          newP = entry.piloting;
          if (newG < MIN_SKILL) continue;
          priority = GUNNERY_PRIORITY_ROLES.has(role) ? 1.2 : 0.8;
        } else {
          newG = entry.gunnery;
          newP = entry.piloting - 1;
          if (newP < MIN_SKILL) continue;
          priority = PILOTING_PRIORITY_ROLES.has(role) ? 1.2 : 0.8;
        }

        const cost = adjustedBv(entry.unit.bv, newG, newP) - entry.adjustedBv;
        if (cost <= 0 || cost > remaining) continue;

        const score = cost / priority;
        if (score < bestScore) {
          bestScore = score;
          bestEntry = entry;
          bestSkill = skill;
        }
      }
    }

    if (!bestEntry) break;

    if (bestSkill === 'gunnery') {
      bestEntry.gunnery -= 1;
    } else {
      bestEntry.piloting -= 1;
    }
    bestEntry.adjustedBv = adjustedBv(bestEntry.unit.bv, bestEntry.gunnery, bestEntry.piloting);
  }
}
