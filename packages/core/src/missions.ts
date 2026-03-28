import type { Mission, Role, WeightClass } from './models.js';

export interface MissionProfile {
  name: string;
  description: string;
  roleWeights: Partial<Record<Role, number>>;
  weightDistribution: Partial<Record<WeightClass, number>>;
}

export interface Slot {
  role: Role;
  weightClass: WeightClass;
  bvTarget: number;
}

export const MISSION_PROFILES: Record<Mission, MissionProfile> = {
  pitched_battle: {
    name: 'Pitched Battle',
    description: 'Standard direct engagement — destroy or rout the enemy.',
    roleWeights: { Juggernaut: 0.25, Brawler: 0.25, Sniper: 0.20, 'Missile Boat': 0.15, Skirmisher: 0.15 },
    weightDistribution: { ASSAULT: 0.20, HEAVY: 0.40, MEDIUM: 0.40 },
  },
  recon: {
    name: 'Recon',
    description: 'Locate hidden objectives, search buildings, gather intel.',
    roleWeights: { Skirmisher: 0.40, Striker: 0.40, Sniper: 0.20 },
    weightDistribution: { LIGHT: 0.40, MEDIUM: 0.40, HEAVY: 0.20 },
  },
  objective_raid: {
    name: 'Objective Raid',
    description: 'Destroy installations, turrets, buildings, infrastructure.',
    roleWeights: { Sniper: 0.30, 'Missile Boat': 0.25, Striker: 0.25, Brawler: 0.20 },
    weightDistribution: { MEDIUM: 0.35, HEAVY: 0.35, LIGHT: 0.15, ASSAULT: 0.15 },
  },
  defense: {
    name: 'Defense',
    description: 'Hold a position, protect buildings or installations.',
    roleWeights: { Juggernaut: 0.30, Sniper: 0.25, 'Missile Boat': 0.25, Brawler: 0.20 },
    weightDistribution: { ASSAULT: 0.35, HEAVY: 0.40, MEDIUM: 0.25 },
  },
  escort: {
    name: 'Escort',
    description: 'Protect a convoy or VIP mech moving across the map.',
    roleWeights: { Skirmisher: 0.30, Brawler: 0.25, Striker: 0.25, Juggernaut: 0.20 },
    weightDistribution: { HEAVY: 0.30, MEDIUM: 0.35, LIGHT: 0.20, ASSAULT: 0.15 },
  },
  extraction: {
    name: 'Extraction',
    description: 'Retrieve an objective/unit and bring it back to your edge.',
    roleWeights: { Striker: 0.35, Skirmisher: 0.30, Brawler: 0.20, Sniper: 0.15 },
    weightDistribution: { MEDIUM: 0.40, LIGHT: 0.30, HEAVY: 0.25, ASSAULT: 0.05 },
  },
  breakthrough: {
    name: 'Breakthrough',
    description: 'Escape through enemy lines with as many units as possible.',
    roleWeights: { Brawler: 0.30, Skirmisher: 0.30, Juggernaut: 0.25, Striker: 0.15 },
    weightDistribution: { HEAVY: 0.40, MEDIUM: 0.40, ASSAULT: 0.20 },
  },
  zone_control: {
    name: 'Zone Control',
    description: 'Hold multiple objective points spread across the map.',
    roleWeights: { Juggernaut: 0.25, Skirmisher: 0.25, Sniper: 0.25, Brawler: 0.25 },
    weightDistribution: { HEAVY: 0.35, MEDIUM: 0.40, ASSAULT: 0.25 },
  },
};

// Role → preferred weight classes (heavier roles → heavier mechs)
const ROLE_WEIGHT_AFFINITY: Record<Role, WeightClass[]> = {
  Juggernaut: ['ASSAULT', 'HEAVY'],
  Brawler: ['HEAVY', 'MEDIUM', 'ASSAULT'],
  Sniper: ['HEAVY', 'MEDIUM'],
  'Missile Boat': ['HEAVY', 'MEDIUM', 'ASSAULT'],
  Skirmisher: ['MEDIUM', 'HEAVY', 'LIGHT'],
  Striker: ['MEDIUM', 'LIGHT'],
  Scout: ['LIGHT', 'MEDIUM'],
};

// BV budget weight per weight class (relative to average)
const WEIGHT_CLASS_BV_FACTOR: Record<WeightClass, number> = {
  ASSAULT: 1.35,
  HEAVY: 1.15,
  MEDIUM: 1.00,
  LIGHT: 0.70,
};

const WEIGHT_ORDER: Record<WeightClass, number> = {
  ASSAULT: 0, HEAVY: 1, MEDIUM: 2, LIGHT: 3,
};

export function assignSlots(mission: Mission, count: number, bvBudget: number): Slot[] {
  const profile = MISSION_PROFILES[mission];

  // --- Step 1: Distribute roles across slots ---
  const sortedRoles = Object.entries(profile.roleWeights)
    .sort(([, a], [, b]) => b - a) as [Role, number][];

  const roleSlots: Role[] = [];
  let remaining = count;
  for (let i = 0; i < sortedRoles.length; i++) {
    const [role, weight] = sortedRoles[i];
    let n: number;
    if (i === sortedRoles.length - 1) {
      n = remaining;
    } else {
      n = Math.round(count * weight);
      n = Math.min(n, remaining);
    }
    for (let j = 0; j < n; j++) roleSlots.push(role);
    remaining -= n;
    if (remaining <= 0) break;
  }

  // --- Step 2: Assign weight class per slot ---
  const sortedWcs = Object.entries(profile.weightDistribution)
    .sort(([, a], [, b]) => b - a) as [WeightClass, number][];

  const wcCounts: Partial<Record<WeightClass, number>> = {};
  let wcRemaining = count;
  for (let i = 0; i < sortedWcs.length; i++) {
    const [wc, pct] = sortedWcs[i];
    let n: number;
    if (i === sortedWcs.length - 1) {
      n = wcRemaining;
    } else {
      n = Math.round(count * pct);
      n = Math.min(n, wcRemaining);
    }
    wcCounts[wc] = n;
    wcRemaining -= n;
    if (wcRemaining <= 0) break;
  }

  // Build pool of weight classes
  const wcPool: WeightClass[] = [];
  for (const wc of ['ASSAULT', 'HEAVY', 'MEDIUM', 'LIGHT'] as WeightClass[]) {
    const n = wcCounts[wc] ?? 0;
    for (let i = 0; i < n; i++) wcPool.push(wc);
  }

  // Match roles to weight classes based on affinity
  const assignedWcs: WeightClass[] = new Array(count).fill('MEDIUM');
  const usedWcIndices = new Set<number>();

  for (let slotIdx = 0; slotIdx < roleSlots.length; slotIdx++) {
    const role = roleSlots[slotIdx];
    const preferred = ROLE_WEIGHT_AFFINITY[role] ?? (['MEDIUM'] as WeightClass[]);
    let bestWcIdx: number | null = null;
    let bestPriority = 999;

    for (let wcIdx = 0; wcIdx < wcPool.length; wcIdx++) {
      if (usedWcIndices.has(wcIdx)) continue;
      const pIdx = preferred.indexOf(wcPool[wcIdx]);
      if (pIdx >= 0 && pIdx < bestPriority) {
        bestPriority = pIdx;
        bestWcIdx = wcIdx;
      }
    }

    if (bestWcIdx === null) {
      for (let wcIdx = 0; wcIdx < wcPool.length; wcIdx++) {
        if (!usedWcIndices.has(wcIdx)) {
          bestWcIdx = wcIdx;
          break;
        }
      }
    }

    if (bestWcIdx !== null) {
      assignedWcs[slotIdx] = wcPool[bestWcIdx];
      usedWcIndices.add(bestWcIdx);
    }
  }

  // --- Step 3: Assign BV budget per slot ---
  const factors = assignedWcs.map(wc => WEIGHT_CLASS_BV_FACTOR[wc]);
  const totalFactor = factors.reduce((a, b) => a + b, 0);
  const bvTargets = factors.map(f => Math.round(bvBudget * f / totalFactor));

  // Fix rounding so sum equals budget
  const diff = bvBudget - bvTargets.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    const largestIdx = bvTargets.indexOf(Math.max(...bvTargets));
    bvTargets[largestIdx] += diff;
  }

  // Build slots sorted heaviest first
  const slots: Slot[] = roleSlots.map((role, i) => ({
    role,
    weightClass: assignedWcs[i],
    bvTarget: bvTargets[i],
  }));

  slots.sort((a, b) => WEIGHT_ORDER[a.weightClass] - WEIGHT_ORDER[b.weightClass]);

  return slots;
}
