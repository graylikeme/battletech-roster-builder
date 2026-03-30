import { describe, it, expect } from 'vitest';
import { getRequiredPipFilenames } from '../src/layout/draw-pips.js';
import type { RecordSheetData, MechLocation } from '../src/record-sheet-data.js';

function makeTestData(overrides: Partial<RecordSheetData> = {}): RecordSheetData {
  const armorByLocation = new Map<MechLocation, { front: number; rear?: number }>([
    ['head', { front: 8 }],
    ['center_torso', { front: 12, rear: 4 }],
    ['left_torso', { front: 10, rear: 2 }],
    ['right_torso', { front: 10, rear: 2 }],
    ['left_arm', { front: 6 }],
    ['right_arm', { front: 6 }],
    ['left_leg', { front: 6 }],
    ['right_leg', { front: 6 }],
  ]);

  const structureByLocation = new Map<MechLocation, number>([
    ['head', 3], ['center_torso', 12], ['left_torso', 10], ['right_torso', 10],
    ['left_arm', 6], ['right_arm', 6], ['left_leg', 10], ['right_leg', 10],
  ]);

  const criticalSlots = new Map<MechLocation, { name: string; isCritable: boolean }[]>();
  for (const loc of ['head', 'left_leg', 'right_leg'] as MechLocation[]) {
    criticalSlots.set(loc, Array(6).fill(null).map(() => ({ name: 'Roll Again', isCritable: false })));
  }
  for (const loc of ['center_torso', 'left_torso', 'right_torso', 'left_arm', 'right_arm'] as MechLocation[]) {
    criticalSlots.set(loc, Array(12).fill(null).map(() => ({ name: 'Roll Again', isCritable: false })));
  }

  return {
    mechName: 'Test Mech TST-1',
    variant: 'TST-1',
    tonnage: 50,
    bv: 1000,
    cost: 5000000,
    techBase: 'inner_sphere',
    rulesLevel: 'standard',
    introYear: 3025,
    config: 'Biped',
    walkMp: 5,
    runMp: 8,
    jumpMp: 0,
    engineName: 'Standard Fusion',
    engineRating: 250,
    gyroName: 'Standard Gyro',
    cockpitName: 'Standard Cockpit',
    heatSinkCount: 10,
    heatSinkType: 'Single',
    totalWeaponHeat: 6,
    heatDissipation: 10,
    armorType: 'Standard',
    armorByLocation,
    totalArmor: 72,
    structureType: 'Standard',
    structureByLocation,
    weapons: [],
    ammo: [],
    criticalSlots,
    quirks: [],
    ...overrides,
  };
}

describe('getRequiredPipFilenames', () => {
  it('returns filenames for all armor and structure locations', () => {
    const data = makeTestData();
    const filenames = getRequiredPipFilenames(data);

    // Front armor (8 locations, but right-side reuses left-side prefixes)
    expect(filenames).toContain('TW_BP_HD_08.png');
    expect(filenames).toContain('TW_BP_CT_12.png');
    expect(filenames).toContain('TW_BP_LT_10.png');  // used for both LT and RT
    expect(filenames).toContain('TW_BP_LA_06.png');   // used for both LA and RA
    expect(filenames).toContain('TW_BP_LL_06.png');   // used for both LL and RL

    // Rear armor
    expect(filenames).toContain('TW_BP_CTR_04.png');
    expect(filenames).toContain('TW_BP_LTR_02.png');  // used for both LT rear and RT rear

    // Internal structure
    expect(filenames).toContain('TW_BP_INT_HD_03.png');
    expect(filenames).toContain('TW_BP_INT_CT_12.png');
    expect(filenames).toContain('TW_BP_INT_LT_10.png');
    expect(filenames).toContain('TW_BP_INT_LA_06.png');
    expect(filenames).toContain('TW_BP_INT_LL_10.png');
  });

  it('returns deduplicated filenames (right-side reuses left-side images)', () => {
    const data = makeTestData();
    const filenames = getRequiredPipFilenames(data);

    // Right-side locations use same prefixes as left-side, so same filenames
    // LT and RT both use LT_ prefix with same count (10) -> one filename
    const ltCount = filenames.filter(f => f === 'TW_BP_LT_10.png').length;
    expect(ltCount).toBe(1);

    // No duplicates at all
    expect(filenames.length).toBe(new Set(filenames).size);
  });

  it('skips locations with zero armor or structure', () => {
    const armorByLocation = new Map<MechLocation, { front: number; rear?: number }>([
      ['head', { front: 0 }],
      ['center_torso', { front: 12, rear: 0 }],
      ['left_torso', { front: 0 }],
      ['right_torso', { front: 0 }],
      ['left_arm', { front: 0 }],
      ['right_arm', { front: 0 }],
      ['left_leg', { front: 0 }],
      ['right_leg', { front: 0 }],
    ]);
    const structureByLocation = new Map<MechLocation, number>([
      ['head', 0], ['center_torso', 0], ['left_torso', 0], ['right_torso', 0],
      ['left_arm', 0], ['right_arm', 0], ['left_leg', 0], ['right_leg', 0],
    ]);
    const data = makeTestData({ armorByLocation, structureByLocation, totalArmor: 12 });
    const filenames = getRequiredPipFilenames(data);

    // Only CT front armor should appear
    expect(filenames).toEqual(['TW_BP_CT_12.png']);
  });

  it('handles missing locations gracefully', () => {
    const armorByLocation = new Map<MechLocation, { front: number; rear?: number }>();
    const structureByLocation = new Map<MechLocation, number>();
    const data = makeTestData({ armorByLocation, structureByLocation, totalArmor: 0 });
    const filenames = getRequiredPipFilenames(data);

    expect(filenames).toEqual([]);
  });

  it('pads single-digit counts with leading zero', () => {
    const armorByLocation = new Map<MechLocation, { front: number; rear?: number }>([
      ['head', { front: 3 }],
      ['center_torso', { front: 0 }],
      ['left_torso', { front: 0 }],
      ['right_torso', { front: 0 }],
      ['left_arm', { front: 0 }],
      ['right_arm', { front: 0 }],
      ['left_leg', { front: 0 }],
      ['right_leg', { front: 0 }],
    ]);
    const structureByLocation = new Map<MechLocation, number>();
    const data = makeTestData({ armorByLocation, structureByLocation, totalArmor: 3 });
    const filenames = getRequiredPipFilenames(data);

    expect(filenames).toContain('TW_BP_HD_03.png');
  });
});
