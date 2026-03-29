/**
 * RecordSheetData: fully resolved data contract for rendering a mech record sheet.
 * Built from MechDetail + equipment stats + internal structure via the API.
 */
import type {
  MechDetail, LoadoutEntry, LocationEntry, QuirkEntry,
  EquipmentDetail, InternalStructure,
} from '@bt-roster/core';
import {
  fetchUnitDetail, fetchEquipmentDetails, fetchInternalStructure,
} from '@bt-roster/core';
import { LOCATION_ABBREV } from './points/print-consts.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MechLocation =
  | 'head' | 'center_torso' | 'left_torso' | 'right_torso'
  | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';

const ALL_LOCATIONS: MechLocation[] = [
  'head', 'center_torso', 'left_torso', 'right_torso',
  'left_arm', 'right_arm', 'left_leg', 'right_leg',
];

export interface WeaponTableEntry {
  count: number;
  name: string;
  location: string;       // abbreviation: HD, CT, LT, RT, LA, RA, LL, RL
  heat: string;
  damage: string;
  rangeMin: string;
  rangeShort: string;
  rangeMedium: string;
  rangeLong: string;
  isRearFacing: boolean;
}

export interface AmmoTableEntry {
  name: string;
  location: string;
  rounds: number;
}

export interface CritSlot {
  name: string;
  isCritable: boolean;
}

export interface ArmorValues {
  front: number;
  rear?: number;
}

export interface RecordSheetData {
  // Identity
  mechName: string;
  variant: string;
  tonnage: number;
  bv: number;
  cost: number | null;
  techBase: string;
  rulesLevel: string;
  introYear?: number;
  config: string;           // "Biped" or "Quad"

  // Movement
  walkMp: number;
  runMp: number;
  jumpMp: number;

  // Engine / internals
  engineName: string;
  engineRating: number;
  gyroName: string;
  cockpitName: string;

  // Heat
  heatSinkCount: number;
  heatSinkType: string;     // "Single" or "Double"
  totalWeaponHeat: number;
  heatDissipation: number;

  // Armor
  armorType: string;
  armorByLocation: Map<MechLocation, ArmorValues>;
  totalArmor: number;

  // Internal structure
  structureType: string;
  structureByLocation: Map<MechLocation, number>;

  // Weapons & ammo
  weapons: WeaponTableEntry[];
  ammo: AmmoTableEntry[];

  // Critical hit table (12 slots per torso/arm location, 6 per head/leg)
  criticalSlots: Map<MechLocation, CritSlot[]>;

  // Pilot (optional, for roster-based sheets)
  pilotName?: string;
  gunnery?: number;
  piloting?: number;

  // Quirks
  quirks: QuirkEntry[];
}

// ---------------------------------------------------------------------------
// Fixed internal equipment per location
// ---------------------------------------------------------------------------

const FIXED_HEAD: CritSlot[] = [
  { name: 'Life Support', isCritable: false },
  { name: 'Sensors', isCritable: false },
  { name: 'Cockpit', isCritable: false },
  { name: '', isCritable: false },  // slot 4 - filled by loadout or empty
  { name: 'Sensors', isCritable: false },
  { name: 'Life Support', isCritable: false },
];

const FIXED_ARM_PREFIX: CritSlot[] = [
  { name: 'Shoulder', isCritable: false },
  { name: 'Upper Arm Actuator', isCritable: false },
  { name: 'Lower Arm Actuator', isCritable: false },
  { name: 'Hand Actuator', isCritable: false },
];

const FIXED_LEG: CritSlot[] = [
  { name: 'Hip', isCritable: false },
  { name: 'Upper Leg Actuator', isCritable: false },
  { name: 'Lower Leg Actuator', isCritable: false },
  { name: 'Foot Actuator', isCritable: false },
  { name: 'Roll Again', isCritable: false },
  { name: 'Roll Again', isCritable: false },
];

function engineCTSlots(engineType: string): number {
  const et = engineType.toLowerCase();
  if (et.includes('xl') || et.includes('light') || et.includes('compact')) return 3;
  return 6; // Standard, ICE
}

function gyroSlots(gyroName: string): number {
  const g = gyroName.toLowerCase();
  if (g.includes('xl')) return 6;
  if (g.includes('compact')) return 2;
  if (g.includes('heavy-duty') || g.includes('heavy duty')) return 4;
  return 4; // Standard
}

function engineSTSlots(engineType: string): number {
  const et = engineType.toLowerCase();
  if (et.includes('xl')) return 3;
  if (et.includes('light')) return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// Build critical slot table
// ---------------------------------------------------------------------------

/** Strip tech base and "Ammo" prefixes: "IS Ammo SRM-2" -> "SRM-2" */
function stripAmmoPrefix(equipmentName: string): string {
  return equipmentName
    .replace(/^(IS|Clan|Inner Sphere)\s+/i, '')
    .replace(/^Ammo\s+/i, '')
    .replace(/\s+Ammo$/i, '');
}

/** Format ammo for critical slots: "IS Ammo SRM-2" -> "@SRM 2 (50)" */
function formatAmmoCritName(equipmentName: string, shotsPerTon: number): string {
  let name = stripAmmoPrefix(equipmentName);
  // "SRM-2" -> "SRM 2"
  name = name.replace(/-(\d)/g, ' $1');
  return `@${name} (${shotsPerTon})`;
}

function buildCritSlots(
  detail: MechDetail,
  loadout: LoadoutEntry[],
  equipmentDetails: Map<string, EquipmentDetail>,
): Map<MechLocation, CritSlot[]> {
  const result = new Map<MechLocation, CritSlot[]>();

  for (const loc of ALL_LOCATIONS) {
    const totalSlots = (loc === 'head' || loc === 'left_leg' || loc === 'right_leg') ? 6 : 12;
    const slots: CritSlot[] = new Array(totalSlots).fill(null).map(() => ({
      name: 'Roll Again', isCritable: false,
    }));

    // Place fixed internal equipment
    if (loc === 'head') {
      for (let i = 0; i < FIXED_HEAD.length; i++) {
        if (FIXED_HEAD[i].name) slots[i] = { ...FIXED_HEAD[i] };
      }
    } else if (loc === 'left_arm' || loc === 'right_arm') {
      // Check if this arm has lower arm and hand actuators
      const armLoadout = loadout.filter(e => e.location === loc);
      const hasLowerArm = !armLoadout.some(e =>
        e.equipmentName.includes('Lower Arm Actuator') && e.slots?.length === 0
      );
      const hasHand = !armLoadout.some(e =>
        e.equipmentName.includes('Hand Actuator') && e.slots?.length === 0
      );
      // Always place shoulder and upper arm
      slots[0] = { name: 'Shoulder', isCritable: false };
      slots[1] = { name: 'Upper Arm Actuator', isCritable: false };
      if (hasLowerArm) slots[2] = { name: 'Lower Arm Actuator', isCritable: false };
      if (hasHand) slots[3] = { name: 'Hand Actuator', isCritable: false };
    } else if (loc === 'left_leg' || loc === 'right_leg') {
      for (let i = 0; i < FIXED_LEG.length; i++) {
        slots[i] = { ...FIXED_LEG[i] };
      }
    } else if (loc === 'center_torso') {
      const eCT = engineCTSlots(detail.engineName ?? 'Standard Fusion');
      for (let i = 0; i < eCT; i++) {
        slots[i] = { name: 'Fusion Engine', isCritable: false };
      }
      const gSlots = gyroSlots(detail.gyroName ?? 'Standard Gyro');
      for (let i = eCT; i < eCT + gSlots; i++) {
        if (i < totalSlots) slots[i] = { name: 'Gyro', isCritable: false };
      }
    } else if (loc === 'left_torso' || loc === 'right_torso') {
      const stSlots = engineSTSlots(detail.engineName ?? 'Standard Fusion');
      for (let i = 0; i < stSlots; i++) {
        slots[i] = { name: 'Fusion Engine', isCritable: false };
      }
    }

    // Place loadout items using API-provided slot positions
    const locLoadout = loadout.filter(e => e.location === loc);
    for (const entry of locLoadout) {
      if (entry.slots && entry.slots.length > 0) {
        const eq = equipmentDetails.get(entry.equipmentSlug);
        const isAmmo = eq?.category === 'ammunition';
        const displayName = isAmmo && eq?.shotsPerTon
          ? formatAmmoCritName(entry.equipmentName, eq.shotsPerTon)
          : entry.equipmentName;

        for (const slotNum of entry.slots) {
          const idx = slotNum - 1; // API slots are 1-based
          if (idx >= 0 && idx < totalSlots) {
            slots[idx] = { name: displayName, isCritable: true };
          }
        }
      }
    }

    result.set(loc, slots);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build weapons table
// ---------------------------------------------------------------------------

const WEAPON_CATEGORIES = new Set([
  'energy_weapon', 'ballistic_weapon', 'missile_weapon', 'artillery',
]);

function buildWeaponsTable(
  loadout: LoadoutEntry[],
  equipmentDetails: Map<string, EquipmentDetail>,
): WeaponTableEntry[] {
  const entries: WeaponTableEntry[] = [];

  for (const entry of loadout) {
    const eq = equipmentDetails.get(entry.equipmentSlug);
    if (!eq || !WEAPON_CATEGORIES.has(eq.category)) continue;

    const locAbbr = LOCATION_ABBREV[entry.location] ?? entry.location;
    entries.push({
      count: entry.quantity,
      name: entry.equipmentName,
      location: locAbbr + (entry.isRearFacing ? ' (R)' : ''),
      heat: eq.heat != null ? String(eq.heat) : '--',
      damage: eq.damage ?? '--',
      rangeMin: eq.rangeMin != null ? String(eq.rangeMin) : '--',
      rangeShort: eq.rangeShort != null ? String(eq.rangeShort) : '--',
      rangeMedium: eq.rangeMedium != null ? String(eq.rangeMedium) : '--',
      rangeLong: eq.rangeLong != null ? String(eq.rangeLong) : '--',
      isRearFacing: entry.isRearFacing,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Build ammo table
// ---------------------------------------------------------------------------

function buildAmmoTable(
  loadout: LoadoutEntry[],
  equipmentDetails: Map<string, EquipmentDetail>,
): AmmoTableEntry[] {
  const entries: AmmoTableEntry[] = [];

  for (const entry of loadout) {
    const eq = equipmentDetails.get(entry.equipmentSlug);
    if (!eq || eq.category !== 'ammunition') continue;

    const locAbbr = LOCATION_ABBREV[entry.location] ?? entry.location;
    const shotsPerTon = eq.shotsPerTon ?? 0;
    entries.push({
      name: stripAmmoPrefix(entry.equipmentName),
      location: locAbbr,
      rounds: shotsPerTon * entry.quantity,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Build armor map
// ---------------------------------------------------------------------------

function buildArmorMap(locations: LocationEntry[]): Map<MechLocation, ArmorValues> {
  const map = new Map<MechLocation, ArmorValues>();
  for (const loc of locations) {
    const key = loc.location as MechLocation;
    if (!ALL_LOCATIONS.includes(key)) continue;
    map.set(key, {
      front: loc.armorPoints ?? 0,
      rear: loc.rearArmor ?? undefined,
    });
  }
  return map;
}

function totalArmor(armorMap: Map<MechLocation, ArmorValues>): number {
  let total = 0;
  for (const v of armorMap.values()) {
    total += v.front + (v.rear ?? 0);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Build internal structure map
// ---------------------------------------------------------------------------

function buildStructureMap(is: InternalStructure): Map<MechLocation, number> {
  const map = new Map<MechLocation, number>();
  map.set('head', is.head);
  map.set('center_torso', is.centerTorso);
  map.set('left_torso', is.sideTorso);
  map.set('right_torso', is.sideTorso);
  map.set('left_arm', is.arm);
  map.set('right_arm', is.arm);
  map.set('left_leg', is.leg);
  map.set('right_leg', is.leg);
  return map;
}

// ---------------------------------------------------------------------------
// Heat calculations
// ---------------------------------------------------------------------------

function calcWeaponHeat(
  loadout: LoadoutEntry[],
  equipmentDetails: Map<string, EquipmentDetail>,
): number {
  let total = 0;
  for (const entry of loadout) {
    const eq = equipmentDetails.get(entry.equipmentSlug);
    if (!eq || !WEAPON_CATEGORIES.has(eq.category)) continue;
    total += (eq.heat ?? 0) * entry.quantity;
  }
  return total;
}

function calcDissipation(heatSinkCount: number, heatSinkType: string): number {
  const isDouble = heatSinkType.toLowerCase().includes('double');
  return heatSinkCount * (isDouble ? 2 : 1);
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

export interface BuildOptions {
  pilotName?: string;
  gunnery?: number;
  piloting?: number;
}

/**
 * Build a fully resolved RecordSheetData from a unit slug.
 * Fetches all required data from the API.
 */
export async function buildRecordSheetData(
  slug: string,
  options: BuildOptions = {},
): Promise<RecordSheetData> {
  // Fetch unit detail
  const detail = await fetchUnitDetail(slug);

  // Fetch equipment details for all unique equipment slugs
  const slugs = detail.loadout.map(e => e.equipmentSlug);
  const [equipmentDetails, internalStructure] = await Promise.all([
    fetchEquipmentDetails(slugs),
    fetchInternalStructure(detail.tonnage),
  ]);

  const armorMap = buildArmorMap(detail.locations);
  const structureMap = buildStructureMap(internalStructure);
  const heatSinkCount = detail.heatSinkCount ?? 10;
  const heatSinkType = detail.heatSinkType ?? 'Single';

  return {
    mechName: detail.fullName,
    variant: detail.variant,
    tonnage: detail.tonnage,
    bv: detail.bv,
    cost: detail.cost,
    techBase: detail.techBase,
    rulesLevel: detail.rulesLevel,
    introYear: detail.introYear,
    config: detail.config ?? 'Biped',

    walkMp: detail.walkMp ?? 0,
    runMp: detail.runMp ?? 0,
    jumpMp: detail.jumpMp ?? 0,

    engineName: detail.engineName ?? 'Standard Fusion',
    engineRating: detail.engineRating ?? 0,
    gyroName: detail.gyroName ?? 'Standard Gyro',
    cockpitName: detail.cockpitName ?? 'Standard Cockpit',

    heatSinkCount,
    heatSinkType,
    totalWeaponHeat: calcWeaponHeat(detail.loadout, equipmentDetails),
    heatDissipation: calcDissipation(heatSinkCount, heatSinkType),

    armorType: detail.armorType ?? 'Standard',
    armorByLocation: armorMap,
    totalArmor: totalArmor(armorMap),

    structureType: detail.structureType ?? 'Standard',
    structureByLocation: structureMap,

    weapons: buildWeaponsTable(detail.loadout, equipmentDetails),
    ammo: buildAmmoTable(detail.loadout, equipmentDetails),

    criticalSlots: buildCritSlots(detail, detail.loadout, equipmentDetails),

    pilotName: options.pilotName,
    gunnery: options.gunnery,
    piloting: options.piloting,

    quirks: detail.quirks,
  };
}

/**
 * Build RecordSheetData from an already-fetched MechDetail.
 * Still needs to fetch equipment details and internal structure.
 */
export async function buildRecordSheetDataFromDetail(
  detail: MechDetail,
  options: BuildOptions = {},
): Promise<RecordSheetData> {
  const slugs = detail.loadout.map(e => e.equipmentSlug);
  const [equipmentDetails, internalStructure] = await Promise.all([
    fetchEquipmentDetails(slugs),
    fetchInternalStructure(detail.tonnage),
  ]);

  const armorMap = buildArmorMap(detail.locations);
  const structureMap = buildStructureMap(internalStructure);
  const heatSinkCount = detail.heatSinkCount ?? 10;
  const heatSinkType = detail.heatSinkType ?? 'Single';

  return {
    mechName: detail.fullName,
    variant: detail.variant,
    tonnage: detail.tonnage,
    bv: detail.bv,
    cost: detail.cost,
    techBase: detail.techBase,
    rulesLevel: detail.rulesLevel,
    introYear: detail.introYear,
    config: detail.config ?? 'Biped',

    walkMp: detail.walkMp ?? 0,
    runMp: detail.runMp ?? 0,
    jumpMp: detail.jumpMp ?? 0,

    engineName: detail.engineName ?? 'Standard Fusion',
    engineRating: detail.engineRating ?? 0,
    gyroName: detail.gyroName ?? 'Standard Gyro',
    cockpitName: detail.cockpitName ?? 'Standard Cockpit',

    heatSinkCount,
    heatSinkType,
    totalWeaponHeat: calcWeaponHeat(detail.loadout, equipmentDetails),
    heatDissipation: calcDissipation(heatSinkCount, heatSinkType),

    armorType: detail.armorType ?? 'Standard',
    armorByLocation: armorMap,
    totalArmor: totalArmor(armorMap),

    structureType: detail.structureType ?? 'Standard',
    structureByLocation: structureMap,

    weapons: buildWeaponsTable(detail.loadout, equipmentDetails),
    ammo: buildAmmoTable(detail.loadout, equipmentDetails),

    criticalSlots: buildCritSlots(detail, detail.loadout, equipmentDetails),

    pilotName: options.pilotName,
    gunnery: options.gunnery,
    piloting: options.piloting,

    quirks: detail.quirks,
  };
}
