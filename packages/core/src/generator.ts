import type { Unit, Mission, Era, FactionType, Roster, RosterEntry, WeightClass } from './models.js';
import { weightClassContains } from './models.js';
import { assignSlots, MISSION_PROFILES, type Slot } from './missions.js';
import { adjustedBv, baselineForTechBase, assignPilotsAuto } from './pilots.js';

// Simple seeded PRNG (mulberry32)
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChoice<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export interface GenerateOptions {
  gunnery?: number;
  piloting?: number;
  autoPilots?: boolean;
  factionType?: FactionType;
  factionSlug?: string;
  seed?: number;
}

export function generateRoster(
  units: Unit[],
  count: number,
  bvBudget: number,
  mission: Mission,
  era: Era,
  opts: GenerateOptions = {},
): Roster {
  const { gunnery = 4, piloting = 5, autoPilots = true, factionType, factionSlug, seed } = opts;

  if (units.length < count) {
    throw new Error(`Only ${units.length} units available, but ${count} requested.`);
  }

  const rng = createRng(seed ?? Date.now());

  // Sort units by slug for deterministic ordering across machines.
  // Without this, different API response ordering would produce
  // different rosters for the same seed.
  units = [...units].sort((a, b) => a.slug.localeCompare(b.slug));

  // BV function: accounts for pilot skill baseline
  const unitBv = autoPilots
    ? (u: Unit) => { const [g, p] = baselineForTechBase(u.techBase); return adjustedBv(u.bv, g, p); }
    : (u: Unit) => adjustedBv(u.bv, gunnery, piloting);

  // Check feasibility
  const bvs = units.map(u => unitBv(u)).sort((a, b) => a - b);
  const minPossible = bvs.slice(0, count).reduce((a, b) => a + b, 0);
  const maxPossible = bvs.slice(-count).reduce((a, b) => a + b, 0);

  if (bvBudget < minPossible) {
    throw new Error(`BV budget ${bvBudget} is too low for ${count} units. Minimum feasible: ${minPossible}.`);
  }
  if (bvBudget > maxPossible) {
    throw new Error(`BV budget ${bvBudget} is too high for ${count} units. Maximum feasible: ${maxPossible}.`);
  }

  const profile = MISSION_PROFILES[mission];
  const allowedWcs = new Set(Object.keys(profile.weightDistribution) as WeightClass[]);
  const missionRoles = new Set(Object.keys(profile.roleWeights));

  // Minimum BV among units in allowed weight classes
  const allowedBvs = units
    .filter(u => [...allowedWcs].some(wc => weightClassContains(wc, u.tonnage)))
    .map(u => unitBv(u))
    .sort((a, b) => a - b);
  const minAllowedBv = allowedBvs[0] ?? bvs[0];

  const slots = assignSlots(mission, count, bvBudget);
  const pool = [...units];
  const selected: RosterEntry[] = [];

  for (const slot of slots) {
    const currentBv = selected.reduce((sum, e) => sum + e.adjustedBv, 0);
    const remainingBudget = bvBudget - currentBv;
    const remainingSlots = count - selected.length;

    let slotTarget: number;
    if (remainingSlots > 1) {
      slotTarget = Math.min(slot.bvTarget, remainingBudget - (remainingSlots - 1) * minAllowedBv);
    } else {
      slotTarget = remainingBudget;
    }

    const slotsAfter = remainingSlots - 1;
    const bvCeiling = Math.max(0, remainingBudget - slotsAfter * minAllowedBv);

    const entry = fillSlot(pool, slot, slotTarget, bvCeiling, gunnery, piloting, autoPilots, rng, allowedWcs, missionRoles);
    if (entry) {
      selected.push(entry);
      const idx = pool.indexOf(entry.unit);
      if (idx >= 0) pool.splice(idx, 1);
    }
  }

  // Fill any remaining slots
  while (selected.length < count && pool.length > 0) {
    const currentBv = selected.reduce((sum, e) => sum + e.adjustedBv, 0);
    const remainingBudget = bvBudget - currentBv;
    const remainingSlots = count - selected.length;
    const target = Math.floor(remainingBudget / remainingSlots);

    const candidates = pool.filter(u => unitBv(u) <= remainingBudget);
    if (candidates.length === 0) break;

    candidates.sort((a, b) => Math.abs(unitBv(a) - target) - Math.abs(unitBv(b) - target));
    const pick = candidates.length <= 3 ? candidates[0] : randomChoice(candidates.slice(0, 5), rng);
    selected.push(makeEntry(pick, gunnery, piloting, autoPilots));
    pool.splice(pool.indexOf(pick), 1);
  }

  // Auto-assign pilot skills
  if (autoPilots) {
    assignPilotsAuto(selected, bvBudget);
  }

  const bvUsed = selected.reduce((sum, e) => sum + e.adjustedBv, 0);
  return {
    entries: selected,
    mission,
    era,
    bvBudget,
    bvUsed,
    bvRemaining: bvBudget - bvUsed,
    totalTonnage: selected.reduce((sum, e) => sum + e.unit.tonnage, 0),
    factionType,
    factionSlug,
  };
}

function makeEntry(unit: Unit, gunnery: number, piloting: number, autoPilots: boolean): RosterEntry {
  if (autoPilots) {
    const [g, p] = baselineForTechBase(unit.techBase);
    return { unit, gunnery: g, piloting: p, baseBv: unit.bv, adjustedBv: adjustedBv(unit.bv, g, p) };
  }
  return { unit, gunnery, piloting, baseBv: unit.bv, adjustedBv: adjustedBv(unit.bv, gunnery, piloting) };
}

function adjacentWeightClasses(wc: WeightClass): WeightClass[] {
  const order: WeightClass[] = ['LIGHT', 'MEDIUM', 'HEAVY', 'ASSAULT'];
  const idx = order.indexOf(wc);
  const result: WeightClass[] = [wc];
  if (idx > 0) result.push(order[idx - 1]);
  if (idx < order.length - 1) result.push(order[idx + 1]);
  return result;
}

function fillSlot(
  pool: Unit[],
  slot: Slot,
  bvTarget: number,
  bvCeiling: number,
  gunnery: number,
  piloting: number,
  autoPilots: boolean,
  rng: () => number,
  allowedWcs: Set<WeightClass>,
  missionRoles: Set<string>,
): RosterEntry | null {
  const ubv = autoPilots
    ? (u: Unit) => { const [g, p] = baselineForTechBase(u.techBase); return adjustedBv(u.bv, g, p); }
    : (u: Unit) => adjustedBv(u.bv, gunnery, piloting);

  for (const tolerance of [0.25, 0.40, 0.60, 1.0]) {
    const bvLow = Math.floor(bvTarget * (1 - tolerance));
    const bvHigh = Math.min(Math.floor(bvTarget * (1 + tolerance)), bvCeiling);

    // Pass 1: exact role + exact weight class
    let candidates = pool.filter(u =>
      u.role === slot.role &&
      weightClassContains(slot.weightClass, u.tonnage) &&
      ubv(u) >= bvLow && ubv(u) <= bvHigh
    );
    if (candidates.length > 0) return makeEntry(randomChoice(candidates, rng), gunnery, piloting, autoPilots);

    // Pass 2: mission-relevant role + exact weight class
    candidates = pool.filter(u =>
      missionRoles.has(u.role ?? '') &&
      weightClassContains(slot.weightClass, u.tonnage) &&
      ubv(u) >= bvLow && ubv(u) <= bvHigh
    );
    if (candidates.length > 0) return makeEntry(randomChoice(candidates, rng), gunnery, piloting, autoPilots);

    // Pass 3: any role + exact weight class
    candidates = pool.filter(u =>
      weightClassContains(slot.weightClass, u.tonnage) &&
      ubv(u) >= bvLow && ubv(u) <= bvHigh
    );
    if (candidates.length > 0) return makeEntry(randomChoice(candidates, rng), gunnery, piloting, autoPilots);

    // Pass 4: exact role + adjacent weight class (allowed only)
    const adjWcs = adjacentWeightClasses(slot.weightClass).filter(wc => allowedWcs.has(wc));
    candidates = pool.filter(u =>
      u.role === slot.role &&
      adjWcs.some(wc => weightClassContains(wc, u.tonnage)) &&
      ubv(u) >= bvLow && ubv(u) <= bvHigh
    );
    if (candidates.length > 0) return makeEntry(randomChoice(candidates, rng), gunnery, piloting, autoPilots);

    // Pass 5: mission-relevant role + adjacent weight class
    candidates = pool.filter(u =>
      missionRoles.has(u.role ?? '') &&
      adjWcs.some(wc => weightClassContains(wc, u.tonnage)) &&
      ubv(u) >= bvLow && ubv(u) <= bvHigh
    );
    if (candidates.length > 0) return makeEntry(randomChoice(candidates, rng), gunnery, piloting, autoPilots);

    // Pass 6: any role + adjacent weight class
    candidates = pool.filter(u =>
      adjWcs.some(wc => weightClassContains(wc, u.tonnage)) &&
      ubv(u) >= bvLow && ubv(u) <= bvHigh
    );
    if (candidates.length > 0) return makeEntry(randomChoice(candidates, rng), gunnery, piloting, autoPilots);
  }

  // Last resort: closest to target within allowed weight classes
  let candidates = pool.filter(u =>
    ubv(u) <= bvCeiling &&
    [...allowedWcs].some(wc => weightClassContains(wc, u.tonnage))
  );
  if (candidates.length === 0) {
    candidates = pool.filter(u => [...allowedWcs].some(wc => weightClassContains(wc, u.tonnage)));
  }
  if (candidates.length === 0) {
    candidates = [...pool];
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => Math.abs(ubv(a) - bvTarget) - Math.abs(ubv(b) - bvTarget));
    return makeEntry(candidates[0], gunnery, piloting, autoPilots);
  }

  return null;
}
