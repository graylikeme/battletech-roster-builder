// ---------------------------------------------------------------------------
// String literal unions (enum equivalents)
// ---------------------------------------------------------------------------

export const ERAS = [
  'AGE_OF_WAR', 'STAR_LEAGUE', 'EARLY_SUCCESSION_WARS', 'LATE_SUCCESSION_WARS',
  'RENAISSANCE', 'CLAN_INVASION', 'CIVIL_WAR', 'JIHAD', 'DARK_AGE', 'IL_CLAN',
] as const;
export type Era = typeof ERAS[number];

export const MISSIONS = [
  'pitched_battle', 'recon', 'objective_raid', 'defense',
  'escort', 'extraction', 'breakthrough', 'zone_control',
] as const;
export type Mission = typeof MISSIONS[number];

export const ROLES = [
  'Brawler', 'Juggernaut', 'Missile Boat', 'Scout', 'Skirmisher', 'Sniper', 'Striker',
] as const;
export type Role = typeof ROLES[number];

export const WEIGHT_CLASSES = ['LIGHT', 'MEDIUM', 'HEAVY', 'ASSAULT'] as const;
export type WeightClass = typeof WEIGHT_CLASSES[number];

export const FACTION_TYPES = ['GREAT_HOUSE', 'CLAN', 'PERIPHERY', 'MERCENARY', 'OTHER'] as const;
export type FactionType = typeof FACTION_TYPES[number];

export const TECH_BASES = ['INNER_SPHERE', 'CLAN', 'MIXED', 'PRIMITIVE'] as const;
export type TechBase = typeof TECH_BASES[number];

export const RULES_LEVELS = ['INTRODUCTORY', 'STANDARD', 'ADVANCED', 'EXPERIMENTAL', 'UNOFFICIAL'] as const;
export type RulesLevel = typeof RULES_LEVELS[number];

// ---------------------------------------------------------------------------
// Weight class utilities
// ---------------------------------------------------------------------------

const WEIGHT_RANGES: Record<WeightClass, [number, number]> = {
  LIGHT: [20, 35],
  MEDIUM: [40, 55],
  HEAVY: [60, 75],
  ASSAULT: [80, 100],
};

export function weightClassFromTonnage(tonnage: number): WeightClass {
  for (const [wc, [min, max]] of Object.entries(WEIGHT_RANGES) as [WeightClass, [number, number]][]) {
    if (tonnage >= min && tonnage <= max) return wc;
  }
  throw new Error(`No weight class for ${tonnage}t`);
}

export function weightClassContains(wc: WeightClass, tonnage: number): boolean {
  const [min, max] = WEIGHT_RANGES[wc];
  return tonnage >= min && tonnage <= max;
}

// ---------------------------------------------------------------------------
// Rules level hierarchy
// ---------------------------------------------------------------------------

const RULES_HIERARCHY = ['introductory', 'standard', 'advanced', 'experimental'] as const;

export function allowedRulesLevels(maxLevel: RulesLevel): string[] {
  if (maxLevel === 'UNOFFICIAL') {
    return [...RULES_HIERARCHY, 'unofficial'];
  }
  const idx = RULES_HIERARCHY.indexOf(maxLevel.toLowerCase() as typeof RULES_HIERARCHY[number]);
  return [...RULES_HIERARCHY.slice(0, idx + 1)];
}

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface Unit {
  slug: string;
  fullName: string;
  variant: string;
  tonnage: number;
  bv: number;
  role: string | null;
  techBase: string;
  rulesLevel: string;
  introYear?: number;
  walkMp?: number;
  runMp?: number;
  jumpMp?: number;
}

export interface RosterEntry {
  unit: Unit;
  gunnery: number;
  piloting: number;
  baseBv: number;
  adjustedBv: number;
}

export interface Roster {
  entries: RosterEntry[];
  mission: Mission;
  era: Era;
  bvBudget: number;
  bvUsed: number;
  bvRemaining: number;
  totalTonnage: number;
  factionType?: FactionType;
  factionSlug?: string;
}

export interface UnitFilters {
  era?: Era;
  factionType?: FactionType;
  factionSlug?: string;
  unitType?: string;
  techBase?: TechBase;
  maxRulesLevel?: RulesLevel;
  bvMin?: number;
  bvMax?: number;
}
