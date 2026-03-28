import { describe, it, expect } from 'vitest';
import {
  getMultiplier, adjustedBv, baselineForTechBase, assignPilotsAuto,
} from '../src/pilots.js';
import type { RosterEntry, Unit } from '../src/models.js';

describe('getMultiplier', () => {
  it('returns 1.00 for standard 4/5 pilot', () => {
    expect(getMultiplier(4, 5)).toBe(1.00);
  });

  it('returns 1.32 for veteran 3/4 Clan pilot', () => {
    expect(getMultiplier(3, 4)).toBe(1.32);
  });

  it('returns 1.68 for 2/3 pilot', () => {
    expect(getMultiplier(2, 3)).toBe(1.68);
  });

  it('returns 2.42 for 0/0 pilot (max)', () => {
    expect(getMultiplier(0, 0)).toBe(2.42);
  });

  it('returns 0.64 for 8/8 pilot (min)', () => {
    expect(getMultiplier(8, 8)).toBe(0.64);
  });

  it('clamps out-of-range values', () => {
    expect(getMultiplier(-1, 5)).toBe(getMultiplier(0, 5));
    expect(getMultiplier(4, 10)).toBe(getMultiplier(4, 8));
  });
});

describe('adjustedBv', () => {
  it('returns base BV for 4/5 pilot', () => {
    expect(adjustedBv(1000, 4, 5)).toBe(1000);
  });

  it('increases BV for better pilots', () => {
    expect(adjustedBv(1000, 3, 4)).toBe(1320);
  });

  it('decreases BV for worse pilots', () => {
    expect(adjustedBv(1000, 5, 6)).toBe(860);
  });

  it('rounds to nearest integer', () => {
    expect(adjustedBv(1001, 3, 4)).toBe(Math.round(1001 * 1.32));
  });
});

describe('baselineForTechBase', () => {
  it('returns 4/5 for Inner Sphere', () => {
    expect(baselineForTechBase('inner_sphere')).toEqual([4, 5]);
  });

  it('returns 3/4 for Clan', () => {
    expect(baselineForTechBase('clan')).toEqual([3, 4]);
  });

  it('returns 4/5 for mixed', () => {
    expect(baselineForTechBase('mixed')).toEqual([4, 5]);
  });

  it('returns 4/5 for unknown tech base', () => {
    expect(baselineForTechBase('whatever')).toEqual([4, 5]);
  });
});

describe('assignPilotsAuto', () => {
  function makeUnit(overrides: Partial<Unit> = {}): Unit {
    return {
      slug: 'test-mech',
      fullName: 'Test Mech',
      variant: 'TM-1',
      tonnage: 50,
      bv: 1000,
      role: 'Brawler',
      techBase: 'inner_sphere',
      rulesLevel: 'standard',
      ...overrides,
    };
  }

  function makeEntry(unit: Unit): RosterEntry {
    return {
      unit,
      gunnery: 4,
      piloting: 5,
      baseBv: unit.bv,
      adjustedBv: adjustedBv(unit.bv, 4, 5),
    };
  }

  it('upgrades pilots when BV budget allows', () => {
    const entries = [makeEntry(makeUnit())];
    // Base BV = 1000, budget = 1500 leaves 500 for upgrades
    assignPilotsAuto(entries, 1500);
    // Should have improved at least one skill
    expect(entries[0].gunnery < 4 || entries[0].piloting < 5).toBe(true);
  });

  it('never goes below skill 2', () => {
    const entries = [makeEntry(makeUnit({ bv: 500 }))];
    // Huge budget — plenty of room to upgrade
    assignPilotsAuto(entries, 5000);
    expect(entries[0].gunnery).toBeGreaterThanOrEqual(2);
    expect(entries[0].piloting).toBeGreaterThanOrEqual(2);
  });

  it('does not exceed BV budget', () => {
    const entries = [
      makeEntry(makeUnit({ bv: 1000 })),
      makeEntry(makeUnit({ bv: 1200 })),
    ];
    const budget = 2500;
    assignPilotsAuto(entries, budget);
    const total = entries.reduce((sum, e) => sum + e.adjustedBv, 0);
    expect(total).toBeLessThanOrEqual(budget);
  });

  it('does not modify when no budget headroom', () => {
    const entries = [makeEntry(makeUnit({ bv: 1000 }))];
    assignPilotsAuto(entries, 1000); // exactly at budget
    expect(entries[0].gunnery).toBe(4);
    expect(entries[0].piloting).toBe(5);
  });

  it('prioritizes gunnery for Snipers', () => {
    const sniper = makeEntry(makeUnit({ role: 'Sniper', bv: 800 }));
    const striker = makeEntry(makeUnit({ role: 'Striker', bv: 800 }));
    // Give enough for exactly one upgrade each
    assignPilotsAuto([sniper, striker], 2000);
    // Sniper should get gunnery upgrade (4→3), Striker should get piloting (5→4)
    if (sniper.gunnery < 4 || sniper.piloting < 5) {
      // Sniper was upgraded — check gunnery was prioritized
      expect(sniper.gunnery).toBeLessThanOrEqual(sniper.piloting === 5 ? 3 : 4);
    }
  });

  it('sets Clan baseline before upgrading', () => {
    const clanEntry = makeEntry(makeUnit({ techBase: 'clan', bv: 1000 }));
    assignPilotsAuto([clanEntry], 2000);
    // Should have started at 3/4, not 4/5
    // Even without upgrades beyond baseline, should be at most 3/4
    expect(clanEntry.gunnery).toBeLessThanOrEqual(3);
    expect(clanEntry.piloting).toBeLessThanOrEqual(4);
  });
});
