import { describe, it, expect } from 'vitest';
import { generateRecordSheet, generateMultiRecordSheet } from '../src/generate-record-sheet.js';
import type { RecordSheetData, MechLocation } from '../src/record-sheet-data.js';

// ---------------------------------------------------------------------------
// Minimal test fixture -- no API calls needed, just RecordSheetData
// ---------------------------------------------------------------------------

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
    weapons: [
      {
        count: 1, name: 'Medium Laser', location: 'RA',
        heat: '3', damage: '5', rangeMin: '--',
        rangeShort: '3', rangeMedium: '6', rangeLong: '9',
        isRearFacing: false,
      },
    ],
    ammo: [],
    criticalSlots,
    quirks: [],
    ...overrides,
  };
}

// 1x1 white PNG (minimal valid template for testing)
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

describe('generateRecordSheet', () => {
  it('produces a non-empty PDF buffer', () => {
    const data = makeTestData();
    const result = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });

    expect(result).toBeDefined();
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('produces valid PDF (starts with %PDF header)', () => {
    const data = makeTestData();
    const result = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });

    // Convert first bytes to string to check PDF header
    const bytes = new Uint8Array(result);
    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
    expect(header).toBe('%PDF-');
  });

  it('works with all optional fields populated', () => {
    const data = makeTestData({
      pilotName: 'Test Pilot',
      gunnery: 3,
      piloting: 4,
      quirks: [{ name: 'command-mech', isPositive: true }],
      ammo: [{ name: 'SRM-2 Ammo', location: 'LT', rounds: 50 }],
    });

    const result = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('works with double heat sinks', () => {
    const data = makeTestData({
      heatSinkCount: 15,
      heatSinkType: 'Double',
      heatDissipation: 30,
    });

    const result = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('handles many weapons (triggers tiny font)', () => {
    const weapons = Array.from({ length: 22 }, (_, i) => ({
      count: 1, name: `Weapon ${i}`, location: 'CT',
      heat: '1', damage: '1', rangeMin: '--',
      rangeShort: '3', rangeMedium: '6', rangeLong: '9',
      isRearFacing: false,
    }));

    const data = makeTestData({ weapons });
    const result = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('handles empty weapons and ammo', () => {
    const data = makeTestData({ weapons: [], ammo: [] });
    const result = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('appends chart page when chartImage provided', () => {
    const data = makeTestData();
    const without = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null });
    const withChart = generateRecordSheet(data, { templateImage: TINY_PNG, pipImageLoader: () => null, chartImage: TINY_PNG });

    expect(withChart.byteLength).toBeGreaterThan(without.byteLength);
  });
});

describe('generateMultiRecordSheet', () => {
  it('generates multi-page PDF', () => {
    const data1 = makeTestData({ mechName: 'Mech Alpha' });
    const data2 = makeTestData({ mechName: 'Mech Beta' });

    const result = generateMultiRecordSheet([data1, data2], { templateImage: TINY_PNG, pipImageLoader: () => null });
    expect(result.byteLength).toBeGreaterThan(0);

    // Multi-page should be larger than single page
    const single = generateRecordSheet(data1, { templateImage: TINY_PNG, pipImageLoader: () => null });
    expect(result.byteLength).toBeGreaterThan(single.byteLength);
  });

  it('appends chart page once at end when chartImage provided', () => {
    const data1 = makeTestData({ mechName: 'Mech Alpha' });
    const data2 = makeTestData({ mechName: 'Mech Beta' });

    const without = generateMultiRecordSheet([data1, data2], { templateImage: TINY_PNG, pipImageLoader: () => null });
    const withChart = generateMultiRecordSheet([data1, data2], { templateImage: TINY_PNG, pipImageLoader: () => null, chartImage: TINY_PNG });

    expect(withChart.byteLength).toBeGreaterThan(without.byteLength);
  });

  it('throws on empty array', () => {
    expect(() => generateMultiRecordSheet([], { templateImage: TINY_PNG, pipImageLoader: () => null }))
      .toThrow('No record sheets to generate');
  });
});
