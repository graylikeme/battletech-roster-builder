import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildRecordSheetDataFromDetail,
} from '../src/record-sheet-data.js';
import type { MechDetail, EquipmentDetail, InternalStructure } from '@bt-roster/core';

// ---------------------------------------------------------------------------
// Mock fetch to intercept API calls for equipment and internal structure
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function graphqlResponse(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Match equipment queries by slug in the query variables
function setupEquipmentMocks(equipment: Record<string, Partial<EquipmentDetail>>) {
  const internalStructure: InternalStructure = {
    tonnage: 40, head: 3, centerTorso: 12, sideTorso: 10, arm: 6, leg: 10,
  };

  mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const query = body.query as string;

    if (query.includes('InternalStructure')) {
      return graphqlResponse({ internalStructure });
    }

    if (query.includes('EquipmentDetail')) {
      const slug = body.variables.slug as string;
      const eq = equipment[slug] ?? {
        slug, name: slug, category: 'misc', heat: null, damage: null,
        rangeMin: null, rangeShort: null, rangeMedium: null, rangeLong: null,
        crits: 1, tonnage: 1, shotsPerTon: null,
      };
      return graphqlResponse({ equipment: eq });
    }

    return graphqlResponse({});
  });
}

// ---------------------------------------------------------------------------
// Test fixture: Assassin ASN-21 MechDetail
// ---------------------------------------------------------------------------

function makeAssassinDetail(): MechDetail {
  return {
    slug: 'assassin-asn-21',
    fullName: 'Assassin ASN-21',
    variant: 'ASN-21',
    tonnage: 40,
    bv: 749,
    cost: 3765813,
    role: 'Striker',
    techBase: 'inner_sphere',
    rulesLevel: 'standard',
    introYear: 2676,
    config: 'Biped',
    walkMp: 7,
    runMp: 11,
    jumpMp: 7,
    engineRating: 280,
    engineName: 'Standard Fusion',
    heatSinkCount: 10,
    heatSinkType: 'Single',
    armorType: 'Standard(Inner Sphere)',
    structureType: 'IS Standard',
    gyroName: 'Standard Gyro',
    cockpitName: 'Standard Cockpit',
    locations: [
      { location: 'left_arm', armorPoints: 6, rearArmor: null, structurePoints: null },
      { location: 'right_arm', armorPoints: 6, rearArmor: null, structurePoints: null },
      { location: 'left_torso', armorPoints: 10, rearArmor: 2, structurePoints: null },
      { location: 'right_torso', armorPoints: 10, rearArmor: 2, structurePoints: null },
      { location: 'center_torso', armorPoints: 12, rearArmor: 4, structurePoints: null },
      { location: 'head', armorPoints: 8, rearArmor: null, structurePoints: null },
      { location: 'left_leg', armorPoints: 6, rearArmor: null, structurePoints: null },
      { location: 'right_leg', armorPoints: 6, rearArmor: null, structurePoints: null },
    ],
    loadout: [
      { equipmentSlug: 'medium-laser', equipmentName: 'Medium Laser', quantity: 1, location: 'right_arm', slots: [4], isRearFacing: false, notes: null },
      { equipmentSlug: 'jump-jet', equipmentName: 'Jump Jet', quantity: 1, location: 'left_torso', slots: [1, 2, 3], isRearFacing: false, notes: null },
      { equipmentSlug: 'srm-2', equipmentName: 'SRM 2', quantity: 1, location: 'left_torso', slots: [4], isRearFacing: false, notes: null },
      { equipmentSlug: 'is-ammo-srm-2', equipmentName: 'IS Ammo SRM-2', quantity: 1, location: 'left_torso', slots: [5], isRearFacing: false, notes: null },
      { equipmentSlug: 'jump-jet', equipmentName: 'Jump Jet', quantity: 1, location: 'right_torso', slots: [1, 2, 3], isRearFacing: false, notes: null },
      { equipmentSlug: 'lrm-5', equipmentName: 'LRM 5', quantity: 1, location: 'right_torso', slots: [4], isRearFacing: false, notes: null },
      { equipmentSlug: 'is-ammo-lrm-5', equipmentName: 'IS Ammo LRM-5', quantity: 1, location: 'right_torso', slots: [5], isRearFacing: false, notes: null },
      { equipmentSlug: 'jump-jet', equipmentName: 'Jump Jet', quantity: 1, location: 'center_torso', slots: [11], isRearFacing: false, notes: null },
    ],
    quirks: [
      { name: 'cramped-cockpit', isPositive: true },
      { name: 'easy-maintain', isPositive: true },
    ],
  };
}

const EQUIPMENT_DATA: Record<string, Partial<EquipmentDetail>> = {
  'medium-laser': {
    slug: 'medium-laser', name: 'Medium Laser', category: 'energy_weapon',
    heat: 3, damage: '5', rangeMin: null, rangeShort: 3, rangeMedium: 6, rangeLong: 9,
    crits: 1, tonnage: 1, shotsPerTon: null,
  },
  'srm-2': {
    slug: 'srm-2', name: 'SRM 2', category: 'missile_weapon',
    heat: 2, damage: '2/hit', rangeMin: null, rangeShort: 3, rangeMedium: 6, rangeLong: 9,
    crits: 1, tonnage: 1, shotsPerTon: null,
  },
  'lrm-5': {
    slug: 'lrm-5', name: 'LRM 5', category: 'missile_weapon',
    heat: 2, damage: '1/hit', rangeMin: 6, rangeShort: 7, rangeMedium: 14, rangeLong: 21,
    crits: 1, tonnage: 2, shotsPerTon: null,
  },
  'is-ammo-srm-2': {
    slug: 'is-ammo-srm-2', name: 'IS Ammo SRM-2', category: 'ammunition',
    heat: null, damage: null, rangeMin: null, rangeShort: null, rangeMedium: null, rangeLong: null,
    crits: 1, tonnage: 1, shotsPerTon: 50,
  },
  'is-ammo-lrm-5': {
    slug: 'is-ammo-lrm-5', name: 'IS Ammo LRM-5', category: 'ammunition',
    heat: null, damage: null, rangeMin: null, rangeShort: null, rangeMedium: null, rangeLong: null,
    crits: 1, tonnage: 1, shotsPerTon: 24,
  },
  'jump-jet': {
    slug: 'jump-jet', name: 'Jump Jet', category: 'jump_jet',
    heat: null, damage: null, rangeMin: null, rangeShort: null, rangeMedium: null, rangeLong: null,
    crits: 1, tonnage: null, shotsPerTon: null,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildRecordSheetDataFromDetail', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setupEquipmentMocks(EQUIPMENT_DATA);
  });

  it('builds basic mech identity fields', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.mechName).toBe('Assassin ASN-21');
    expect(data.variant).toBe('ASN-21');
    expect(data.tonnage).toBe(40);
    expect(data.bv).toBe(749);
    expect(data.cost).toBe(3765813);
    expect(data.techBase).toBe('inner_sphere');
    expect(data.config).toBe('Biped');
    expect(data.introYear).toBe(2676);
  });

  it('populates movement values', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.walkMp).toBe(7);
    expect(data.runMp).toBe(11);
    expect(data.jumpMp).toBe(7);
  });

  it('populates engine and component names', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.engineName).toBe('Standard Fusion');
    expect(data.engineRating).toBe(280);
    expect(data.gyroName).toBe('Standard Gyro');
    expect(data.cockpitName).toBe('Standard Cockpit');
  });

  it('calculates heat correctly', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.heatSinkCount).toBe(10);
    expect(data.heatSinkType).toBe('Single');
    // Medium Laser (3) + SRM 2 (2) + LRM 5 (2) = 7
    expect(data.totalWeaponHeat).toBe(7);
    // 10 single heat sinks = 10 dissipation
    expect(data.heatDissipation).toBe(10);
  });

  it('builds armor map with correct values', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.armorByLocation.get('head')).toEqual({ front: 8 });
    expect(data.armorByLocation.get('center_torso')).toEqual({ front: 12, rear: 4 });
    expect(data.armorByLocation.get('left_torso')).toEqual({ front: 10, rear: 2 });
    expect(data.armorByLocation.get('right_torso')).toEqual({ front: 10, rear: 2 });
    expect(data.armorByLocation.get('left_arm')).toEqual({ front: 6 });
    expect(data.armorByLocation.get('right_arm')).toEqual({ front: 6 });
    expect(data.armorByLocation.get('left_leg')).toEqual({ front: 6 });
    expect(data.armorByLocation.get('right_leg')).toEqual({ front: 6 });
    // Total: 8 + 12+4 + 10+2 + 10+2 + 6 + 6 + 6 + 6 = 72
    expect(data.totalArmor).toBe(72);
  });

  it('builds internal structure map from API', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.structureByLocation.get('head')).toBe(3);
    expect(data.structureByLocation.get('center_torso')).toBe(12);
    expect(data.structureByLocation.get('left_torso')).toBe(10);
    expect(data.structureByLocation.get('right_torso')).toBe(10);
    expect(data.structureByLocation.get('left_arm')).toBe(6);
    expect(data.structureByLocation.get('right_arm')).toBe(6);
    expect(data.structureByLocation.get('left_leg')).toBe(10);
    expect(data.structureByLocation.get('right_leg')).toBe(10);
  });

  it('builds weapons table with stats from equipment API', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.weapons).toHaveLength(3);

    const ml = data.weapons.find(w => w.name === 'Medium Laser');
    expect(ml).toBeDefined();
    expect(ml!.location).toBe('RA');
    expect(ml!.heat).toBe('3');
    expect(ml!.damage).toBe('5');
    expect(ml!.rangeShort).toBe('3');
    expect(ml!.rangeMedium).toBe('6');
    expect(ml!.rangeLong).toBe('9');

    const srm = data.weapons.find(w => w.name === 'SRM 2');
    expect(srm).toBeDefined();
    expect(srm!.location).toBe('LT');
    expect(srm!.heat).toBe('2');
    expect(srm!.damage).toBe('2/hit');

    const lrm = data.weapons.find(w => w.name === 'LRM 5');
    expect(lrm).toBeDefined();
    expect(lrm!.location).toBe('RT');
    expect(lrm!.heat).toBe('2');
    expect(lrm!.damage).toBe('1/hit');
    expect(lrm!.rangeMin).toBe('6');
    expect(lrm!.rangeLong).toBe('21');
  });

  it('builds ammo table with shots from equipment API', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.ammo).toHaveLength(2);

    const srmAmmo = data.ammo.find(a => a.name === 'SRM-2');
    expect(srmAmmo).toBeDefined();
    expect(srmAmmo!.rounds).toBe(50);
    expect(srmAmmo!.location).toBe('LT');

    const lrmAmmo = data.ammo.find(a => a.name === 'LRM-5');
    expect(lrmAmmo).toBeDefined();
    expect(lrmAmmo!.rounds).toBe(24);
    expect(lrmAmmo!.location).toBe('RT');
  });

  it('builds critical slots using API slot positions', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    // Head: Life Support, Sensors, Cockpit, [empty], Sensors, Life Support
    const head = data.criticalSlots.get('head')!;
    expect(head).toHaveLength(6);
    expect(head[0].name).toBe('Life Support');
    expect(head[1].name).toBe('Sensors');
    expect(head[2].name).toBe('Cockpit');
    expect(head[4].name).toBe('Sensors');
    expect(head[5].name).toBe('Life Support');

    // Left Torso: slots 1-3 = Jump Jet, slot 4 = SRM 2, slot 5 = ammo, rest = Roll Again
    const lt = data.criticalSlots.get('left_torso')!;
    expect(lt).toHaveLength(12);
    expect(lt[0].name).toBe('Jump Jet');
    expect(lt[0].isCritable).toBe(true);
    expect(lt[1].name).toBe('Jump Jet');
    expect(lt[2].name).toBe('Jump Jet');
    expect(lt[3].name).toBe('SRM 2');
    expect(lt[4].name).toBe('@SRM 2 (50)');
    expect(lt[5].name).toBe('Roll Again');

    // Right Torso: slots 1-3 = Jump Jet, slot 4 = LRM 5, slot 5 = ammo
    const rt = data.criticalSlots.get('right_torso')!;
    expect(rt[0].name).toBe('Jump Jet');
    expect(rt[3].name).toBe('LRM 5');
    expect(rt[4].name).toBe('@LRM 5 (24)');

    // Center Torso: slots 1-6 = Fusion Engine, 7-10 = Gyro, 11 = Jump Jet
    const ct = data.criticalSlots.get('center_torso')!;
    expect(ct).toHaveLength(12);
    expect(ct[0].name).toBe('Fusion Engine');
    expect(ct[5].name).toBe('Fusion Engine');
    expect(ct[6].name).toBe('Gyro');
    expect(ct[9].name).toBe('Gyro');
    expect(ct[10].name).toBe('Jump Jet');
    expect(ct[10].isCritable).toBe(true);
    expect(ct[11].name).toBe('Roll Again');

    // Right Arm: Shoulder, Upper Arm, Lower Arm, Hand, Medium Laser in slot 4
    const ra = data.criticalSlots.get('right_arm')!;
    expect(ra[0].name).toBe('Shoulder');
    expect(ra[1].name).toBe('Upper Arm Actuator');
    expect(ra[2].name).toBe('Lower Arm Actuator');
    expect(ra[3].name).toBe('Medium Laser'); // API says slot 4 -> index 3
    expect(ra[3].isCritable).toBe(true);

    // Legs: Hip, Upper Leg, Lower Leg, Foot, Roll Again x2
    const ll = data.criticalSlots.get('left_leg')!;
    expect(ll).toHaveLength(6);
    expect(ll[0].name).toBe('Hip');
    expect(ll[3].name).toBe('Foot Actuator');
    expect(ll[4].name).toBe('Roll Again');
    expect(ll[5].name).toBe('Roll Again');
  });

  it('accepts pilot options', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail(), {
      pilotName: 'MechWarrior Smith',
      gunnery: 3,
      piloting: 4,
    });

    expect(data.pilotName).toBe('MechWarrior Smith');
    expect(data.gunnery).toBe(3);
    expect(data.piloting).toBe(4);
  });

  it('includes quirks', async () => {
    const data = await buildRecordSheetDataFromDetail(makeAssassinDetail());

    expect(data.quirks).toHaveLength(2);
    expect(data.quirks[0].name).toBe('cramped-cockpit');
  });

  it('handles double heat sinks', async () => {
    const detail = makeAssassinDetail();
    detail.heatSinkCount = 12;
    detail.heatSinkType = 'Double';

    const data = await buildRecordSheetDataFromDetail(detail);

    expect(data.heatSinkCount).toBe(12);
    expect(data.heatSinkType).toBe('Double');
    expect(data.heatDissipation).toBe(24);
  });
});
