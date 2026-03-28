import { describe, it, expect } from 'vitest';
import { generateRoster } from '../src/generator.js';
import type { Unit, Mission } from '../src/models.js';

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    slug: `mech-${Math.random().toString(36).slice(2, 8)}`,
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

function makeUnitPool(): Unit[] {
  // A diverse pool of units across weight classes and roles
  return [
    // Assault
    makeUnit({ slug: 'atlas', fullName: 'Atlas', tonnage: 100, bv: 1897, role: 'Juggernaut' }),
    makeUnit({ slug: 'stalker', fullName: 'Stalker', tonnage: 85, bv: 1559, role: 'Juggernaut' }),
    makeUnit({ slug: 'annihilator', fullName: 'Annihilator', tonnage: 100, bv: 1434, role: 'Juggernaut' }),
    // Heavy
    makeUnit({ slug: 'marauder', fullName: 'Marauder', tonnage: 75, bv: 1242, role: 'Sniper' }),
    makeUnit({ slug: 'catapult', fullName: 'Catapult', tonnage: 65, bv: 1399, role: 'Missile Boat' }),
    makeUnit({ slug: 'orion', fullName: 'Orion', tonnage: 75, bv: 1429, role: 'Brawler' }),
    makeUnit({ slug: 'jagermech', fullName: 'JagerMech', tonnage: 65, bv: 901, role: 'Sniper' }),
    makeUnit({ slug: 'battleaxe', fullName: 'BattleAxe', tonnage: 70, bv: 1329, role: 'Sniper' }),
    // Medium
    makeUnit({ slug: 'hunchback', fullName: 'Hunchback', tonnage: 50, bv: 1067, role: 'Juggernaut' }),
    makeUnit({ slug: 'wolverine', fullName: 'Wolverine', tonnage: 55, bv: 1101, role: 'Skirmisher' }),
    makeUnit({ slug: 'griffin', fullName: 'Griffin', tonnage: 55, bv: 1272, role: 'Skirmisher' }),
    makeUnit({ slug: 'shadowhawk', fullName: 'Shadow Hawk', tonnage: 55, bv: 1064, role: 'Skirmisher' }),
    makeUnit({ slug: 'clint', fullName: 'Clint', tonnage: 40, bv: 619, role: 'Sniper' }),
    makeUnit({ slug: 'vindicator', fullName: 'Vindicator', tonnage: 45, bv: 1008, role: 'Brawler' }),
    // Light
    makeUnit({ slug: 'jenner', fullName: 'Jenner', tonnage: 35, bv: 875, role: 'Striker' }),
    makeUnit({ slug: 'commando', fullName: 'Commando', tonnage: 25, bv: 557, role: 'Striker' }),
    makeUnit({ slug: 'locust', fullName: 'Locust', tonnage: 20, bv: 432, role: 'Scout' }),
    makeUnit({ slug: 'spider', fullName: 'Spider', tonnage: 30, bv: 622, role: 'Scout' }),
    makeUnit({ slug: 'panther', fullName: 'Panther', tonnage: 35, bv: 769, role: 'Sniper' }),
  ];
}

describe('generateRoster', () => {
  const pool = makeUnitPool();

  it('generates exactly the requested count of entries', () => {
    const roster = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 1 });
    expect(roster.entries).toHaveLength(4);
  });

  it('total adjusted BV does not exceed budget', () => {
    const roster = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 1 });
    expect(roster.bvUsed).toBeLessThanOrEqual(6000);
  });

  it('same seed produces same roster', () => {
    const r1 = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 42 });
    const r2 = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 42 });
    expect(r1.entries.map(e => e.unit.slug)).toEqual(r2.entries.map(e => e.unit.slug));
  });

  it('different seeds produce different rosters', () => {
    const r1 = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 1 });
    const r2 = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 2 });
    const slugs1 = r1.entries.map(e => e.unit.slug).sort();
    const slugs2 = r2.entries.map(e => e.unit.slug).sort();
    // They could theoretically be the same, but very unlikely with a good pool
    // At minimum, the ordering or composition should differ
    expect(slugs1.join(',') === slugs2.join(',')).toBe(false);
  });

  it('defense mission produces no light mechs', () => {
    const roster = generateRoster(pool, 4, 5000, 'defense', 'CLAN_INVASION', { seed: 1 });
    for (const entry of roster.entries) {
      expect(entry.unit.tonnage).toBeGreaterThanOrEqual(40);
    }
  });

  it('zone_control mission produces no light mechs', () => {
    const roster = generateRoster(pool, 4, 5000, 'zone_control', 'CLAN_INVASION', { seed: 1 });
    for (const entry of roster.entries) {
      expect(entry.unit.tonnage).toBeGreaterThanOrEqual(40);
    }
  });

  it('pitched_battle mission produces no light mechs', () => {
    const roster = generateRoster(pool, 4, 5000, 'pitched_battle', 'CLAN_INVASION', { seed: 1 });
    for (const entry of roster.entries) {
      expect(entry.unit.tonnage).toBeGreaterThanOrEqual(40);
    }
  });

  it('recon mission favors lighter mechs', () => {
    const roster = generateRoster(pool, 4, 4000, 'recon', 'CLAN_INVASION', { seed: 1 });
    const avgTonnage = roster.entries.reduce((sum, e) => sum + e.unit.tonnage, 0) / roster.entries.length;
    expect(avgTonnage).toBeLessThan(60); // Should be lighter than average
  });

  it('Clan units get 3/4 pilot baseline with auto pilots', () => {
    const clanPool = pool.map(u => makeUnit({ ...u, techBase: 'clan' }));
    const roster = generateRoster(clanPool, 3, 5000, 'pitched_battle', 'CLAN_INVASION', {
      seed: 1,
      autoPilots: true,
    });
    for (const entry of roster.entries) {
      expect(entry.gunnery).toBeLessThanOrEqual(3);
      expect(entry.piloting).toBeLessThanOrEqual(4);
    }
  });

  it('IS units get 4/5 pilot baseline with auto pilots', () => {
    const roster = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', {
      seed: 1,
      autoPilots: true,
    });
    // All IS units should start at 4/5 baseline (may be upgraded from there)
    for (const entry of roster.entries) {
      expect(entry.gunnery).toBeLessThanOrEqual(4);
      expect(entry.piloting).toBeLessThanOrEqual(5);
    }
  });

  it('fixed pilot skill overrides auto', () => {
    const roster = generateRoster(pool, 3, 6000, 'pitched_battle', 'CLAN_INVASION', {
      seed: 1,
      gunnery: 3,
      piloting: 4,
      autoPilots: false,
    });
    for (const entry of roster.entries) {
      expect(entry.gunnery).toBe(3);
      expect(entry.piloting).toBe(4);
    }
  });

  it('mission-relevant roles are preferred in slot filling', () => {
    const roster = generateRoster(pool, 4, 5000, 'defense', 'CLAN_INVASION', { seed: 1 });
    const defenseRoles = ['Juggernaut', 'Sniper', 'Missile Boat', 'Brawler'];
    const matchCount = roster.entries.filter(e => defenseRoles.includes(e.unit.role ?? '')).length;
    // Most entries should have defense-relevant roles
    expect(matchCount).toBeGreaterThanOrEqual(2);
  });

  it('roster metadata is correct', () => {
    const roster = generateRoster(pool, 4, 6000, 'pitched_battle', 'CLAN_INVASION', { seed: 1 });
    expect(roster.mission).toBe('pitched_battle');
    expect(roster.era).toBe('CLAN_INVASION');
    expect(roster.bvBudget).toBe(6000);
    expect(roster.bvUsed).toBe(roster.entries.reduce((sum, e) => sum + e.adjustedBv, 0));
    expect(roster.bvRemaining).toBe(6000 - roster.bvUsed);
    expect(roster.totalTonnage).toBe(roster.entries.reduce((sum, e) => sum + e.unit.tonnage, 0));
  });

  it('throws when not enough units', () => {
    expect(() => generateRoster([makeUnit()], 4, 6000, 'pitched_battle', 'CLAN_INVASION'))
      .toThrow(/available/i);
  });

  it('throws when budget is too low', () => {
    expect(() => generateRoster(pool, 4, 100, 'pitched_battle', 'CLAN_INVASION'))
      .toThrow(/budget|low/i);
  });
});
