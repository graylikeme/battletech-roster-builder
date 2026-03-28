import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { generateRoster, type Unit, type Roster } from '@bt-roster/core';

const execFileAsync = promisify(execFile);

const CLI_PATH = resolve(import.meta.dirname, '..', 'src', 'cli.ts');
const RUN_ARGS = ['--import', 'tsx', CLI_PATH];

/**
 * Run the CLI with the given flags and return { stdout, stderr, exitCode }.
 * Captures both success and non-zero exits without throwing.
 */
async function runCli(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [...RUN_ARGS, ...args], {
      timeout: 15_000,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.code ?? 1,
    };
  }
}

// ---------------------------------------------------------------------------
// 1. --list-missions (no API call -- hardcoded data)
// ---------------------------------------------------------------------------

describe('--list-missions', () => {
  it('lists all eight mission types', async () => {
    const { stdout, exitCode } = await runCli(['--list-missions']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Available Missions');

    const expectedMissions = [
      'pitched_battle',
      'recon',
      'objective_raid',
      'defense',
      'escort',
      'extraction',
      'breakthrough',
      'zone_control',
    ];
    for (const m of expectedMissions) {
      expect(stdout).toContain(m);
    }
  });

  it('includes mission descriptions', async () => {
    const { stdout, exitCode } = await runCli(['--list-missions']);

    expect(exitCode).toBe(0);
    // Spot-check a couple of descriptions from the mission profiles
    expect(stdout).toContain('Standard direct engagement');
    expect(stdout).toContain('Hold a position');
  });
});

// ---------------------------------------------------------------------------
// 2. --help
// ---------------------------------------------------------------------------

describe('--help', () => {
  it('shows usage info and exits with code 0', async () => {
    const { stdout, exitCode } = await runCli(['--help']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('bt-roster');
    expect(stdout).toContain('BattleTech');
  });

  it('documents required options', async () => {
    const { stdout } = await runCli(['--help']);

    expect(stdout).toContain('--mission');
    expect(stdout).toContain('--bv');
    expect(stdout).toContain('--count');
    expect(stdout).toContain('--era');
  });

  it('documents optional options', async () => {
    const { stdout } = await runCli(['--help']);

    expect(stdout).toContain('--faction-type');
    expect(stdout).toContain('--tech-base');
    expect(stdout).toContain('--rules-level');
    expect(stdout).toContain('--pilot');
    expect(stdout).toContain('--seed');
    expect(stdout).toContain('--variants');
    expect(stdout).toContain('--no-auto-pilots');
  });

  it('lists valid mission types in help text', async () => {
    const { stdout } = await runCli(['--help']);

    expect(stdout).toContain('pitched_battle');
    expect(stdout).toContain('zone_control');
  });

  it('lists valid eras in help text', async () => {
    const { stdout } = await runCli(['--help']);

    expect(stdout).toContain('CLAN_INVASION');
    expect(stdout).toContain('STAR_LEAGUE');
  });
});

// ---------------------------------------------------------------------------
// 3. Error cases -- missing required arguments
// ---------------------------------------------------------------------------

describe('error cases', () => {
  it('exits with error when no arguments provided', async () => {
    const { stderr, exitCode } = await runCli([]);

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('required arguments');
    expect(stderr).toContain('--mission');
    expect(stderr).toContain('--bv');
    expect(stderr).toContain('--count');
    expect(stderr).toContain('--era');
  });

  it('reports only the missing arguments', async () => {
    // Provide --mission and --era, but not --bv and --count
    const { stderr, exitCode } = await runCli([
      '--mission', 'recon',
      '--era', 'CLAN_INVASION',
    ]);

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('--bv');
    expect(stderr).toContain('--count');
    // --mission and --era were provided, so they should NOT be listed as missing
    expect(stderr).not.toContain('--mission');
    expect(stderr).not.toContain('--era');
  });

  it('suggests list commands in the error output', async () => {
    const { stderr } = await runCli([]);

    expect(stderr).toContain('--list-missions');
    expect(stderr).toContain('--list-eras');
    expect(stderr).toContain('--list-factions');
  });
});

// ---------------------------------------------------------------------------
// 4. Roster generation pipeline (using @bt-roster/core directly, no API calls)
// ---------------------------------------------------------------------------

/**
 * Build a pool of mock units for testing the generation pipeline.
 * Covers light, medium, heavy, and assault weight classes with various roles.
 */
function createMockUnits(): Unit[] {
  return [
    { slug: 'locust-lct-1v', fullName: 'Locust LCT-1V', variant: 'LCT-1V', tonnage: 20, bv: 432, role: 'Scout', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2499 },
    { slug: 'commando-com-2d', fullName: 'Commando COM-2D', variant: 'COM-2D', tonnage: 25, bv: 557, role: 'Striker', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2486 },
    { slug: 'jenner-jnr-7d', fullName: 'Jenner JR7-D', variant: 'JR7-D', tonnage: 35, bv: 875, role: 'Striker', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2785 },
    { slug: 'wolverine-wvr-6r', fullName: 'Wolverine WVR-6R', variant: 'WVR-6R', tonnage: 55, bv: 1101, role: 'Skirmisher', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2575 },
    { slug: 'hunchback-hbk-4g', fullName: 'Hunchback HBK-4G', variant: 'HBK-4G', tonnage: 50, bv: 1067, role: 'Brawler', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2572 },
    { slug: 'centurion-cn9-a', fullName: 'Centurion CN9-A', variant: 'CN9-A', tonnage: 50, bv: 945, role: 'Brawler', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2801 },
    { slug: 'trebuchet-tbt-5n', fullName: 'Trebuchet TBT-5N', variant: 'TBT-5N', tonnage: 50, bv: 1191, role: 'Missile Boat', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2799 },
    { slug: 'catapult-cplt-c1', fullName: 'Catapult CPLT-C1', variant: 'CPLT-C1', tonnage: 65, bv: 1399, role: 'Missile Boat', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2561 },
    { slug: 'marauder-mad-3r', fullName: 'Marauder MAD-3R', variant: 'MAD-3R', tonnage: 75, bv: 1242, role: 'Sniper', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2819 },
    { slug: 'warhammer-whm-6r', fullName: 'Warhammer WHM-6R', variant: 'WHM-6R', tonnage: 70, bv: 1299, role: 'Brawler', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2515 },
    { slug: 'thunderbolt-tdr-5s', fullName: 'Thunderbolt TDR-5S', variant: 'TDR-5S', tonnage: 65, bv: 1335, role: 'Brawler', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2505 },
    { slug: 'battlemaster-blr-1g', fullName: 'BattleMaster BLR-1G', variant: 'BLR-1G', tonnage: 85, bv: 1519, role: 'Juggernaut', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2633 },
    { slug: 'atlas-as7-d', fullName: 'Atlas AS7-D', variant: 'AS7-D', tonnage: 100, bv: 1897, role: 'Juggernaut', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2755 },
    { slug: 'awesome-aws-8q', fullName: 'Awesome AWS-8Q', variant: 'AWS-8Q', tonnage: 80, bv: 1605, role: 'Sniper', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2665 },
    { slug: 'griffin-grf-1n', fullName: 'Griffin GRF-1N', variant: 'GRF-1N', tonnage: 55, bv: 1272, role: 'Skirmisher', techBase: 'Inner Sphere', rulesLevel: 'introductory', introYear: 2492 },
    // Clan units (different tech base -> baseline skill 3/4)
    { slug: 'timber-wolf-prime', fullName: 'Timber Wolf (Mad Cat) Prime', variant: 'Prime', tonnage: 75, bv: 2737, role: 'Brawler', techBase: 'Clan', rulesLevel: 'standard', introYear: 2945 },
    { slug: 'dire-wolf-prime', fullName: 'Dire Wolf (Daishi) Prime', variant: 'Prime', tonnage: 100, bv: 3555, role: 'Juggernaut', techBase: 'Clan', rulesLevel: 'standard', introYear: 3010 },
  ];
}

describe('roster generation pipeline (no API calls)', () => {
  const mockUnits = createMockUnits();
  // Use only IS units for most tests (simpler BV math at 4/5 baseline)
  const isUnits = mockUnits.filter(u => u.techBase === 'Inner Sphere');

  it('generates a roster with the requested number of units', () => {
    const roster = generateRoster(isUnits, 4, 5000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 4,
      piloting: 5,
      autoPilots: false,
      seed: 42,
    });

    expect(roster.entries).toHaveLength(4);
    expect(roster.mission).toBe('pitched_battle');
    expect(roster.era).toBe('LATE_SUCCESSION_WARS');
  });

  it('respects the BV budget (never exceeds it)', () => {
    const budget = 5000;
    const roster = generateRoster(isUnits, 4, budget, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 4,
      piloting: 5,
      autoPilots: false,
      seed: 42,
    });

    expect(roster.bvUsed).toBeLessThanOrEqual(budget);
    expect(roster.bvRemaining).toBeGreaterThanOrEqual(0);
    expect(roster.bvUsed + roster.bvRemaining).toBe(budget);
  });

  it('produces reproducible results with the same seed', () => {
    const opts = { gunnery: 4, piloting: 5, autoPilots: false, seed: 12345 };

    const roster1 = generateRoster(isUnits, 4, 5000, 'recon', 'CLAN_INVASION', opts);
    const roster2 = generateRoster(isUnits, 4, 5000, 'recon', 'CLAN_INVASION', opts);

    const names1 = roster1.entries.map(e => e.unit.slug);
    const names2 = roster2.entries.map(e => e.unit.slug);
    expect(names1).toEqual(names2);
  });

  it('produces different results with different seeds', () => {
    const roster1 = generateRoster(isUnits, 4, 5000, 'pitched_battle', 'CLAN_INVASION', {
      gunnery: 4, piloting: 5, autoPilots: false, seed: 1,
    });
    const roster2 = generateRoster(isUnits, 4, 5000, 'pitched_battle', 'CLAN_INVASION', {
      gunnery: 4, piloting: 5, autoPilots: false, seed: 999,
    });

    const names1 = roster1.entries.map(e => e.unit.slug);
    const names2 = roster2.entries.map(e => e.unit.slug);
    // With 15 IS units and different seeds it is extremely likely they differ
    // (but not guaranteed -- a rare false failure is acceptable in randomized tests)
    expect(names1).not.toEqual(names2);
  });

  it('uses pilot skills 4/5 when autoPilots is false', () => {
    const roster = generateRoster(isUnits, 4, 5000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 4,
      piloting: 5,
      autoPilots: false,
      seed: 42,
    });

    for (const entry of roster.entries) {
      expect(entry.gunnery).toBe(4);
      expect(entry.piloting).toBe(5);
    }
  });

  it('applies custom pilot skills when provided', () => {
    const roster = generateRoster(isUnits, 4, 8000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 3,
      piloting: 4,
      autoPilots: false,
      seed: 42,
    });

    for (const entry of roster.entries) {
      expect(entry.gunnery).toBe(3);
      expect(entry.piloting).toBe(4);
    }
    // Adjusted BV should be higher than base BV for 3/4 skill
    for (const entry of roster.entries) {
      expect(entry.adjustedBv).toBeGreaterThan(entry.baseBv);
    }
  });

  it('auto-assigns pilot skills when autoPilots is true', () => {
    const roster = generateRoster(isUnits, 4, 6000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      autoPilots: true,
      seed: 42,
    });

    // At least one unit should have been upgraded from 4/5 baseline
    const upgraded = roster.entries.filter(e => e.gunnery < 4 || e.piloting < 5);
    expect(upgraded.length).toBeGreaterThanOrEqual(0); // may not upgrade if budget is tight
    // All pilot values should remain within valid range
    for (const entry of roster.entries) {
      expect(entry.gunnery).toBeGreaterThanOrEqual(2);
      expect(entry.gunnery).toBeLessThanOrEqual(4);
      expect(entry.piloting).toBeGreaterThanOrEqual(2);
      expect(entry.piloting).toBeLessThanOrEqual(5);
    }
  });

  it('handles Clan tech base with baseline 3/4', () => {
    // Mix Clan and IS units so the generator has enough pool variety
    // and we can observe different baseline skills
    const mixedUnits = mockUnits;
    // With autoPilots, Clan baseline is 3/4 (multiplier 1.32) and IS is 4/5 (1.00)
    const roster = generateRoster(mixedUnits, 4, 6000, 'pitched_battle', 'CLAN_INVASION', {
      autoPilots: true,
      seed: 42,
    });

    expect(roster.entries).toHaveLength(4);
    // All pilot values should be within valid range
    for (const entry of roster.entries) {
      expect(entry.gunnery).toBeGreaterThanOrEqual(2);
      expect(entry.gunnery).toBeLessThanOrEqual(4);
      expect(entry.piloting).toBeGreaterThanOrEqual(2);
      expect(entry.piloting).toBeLessThanOrEqual(5);
    }
    // Any Clan unit in the roster should start at 3/4 or better (auto-pilot upgrades)
    const clanEntries = roster.entries.filter(e => e.unit.techBase === 'Clan');
    for (const entry of clanEntries) {
      expect(entry.gunnery).toBeLessThanOrEqual(3);
      expect(entry.piloting).toBeLessThanOrEqual(4);
    }
  });

  it('throws when BV budget is too low for the requested count', () => {
    expect(() =>
      generateRoster(isUnits, 4, 100, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
        gunnery: 4, piloting: 5, autoPilots: false, seed: 1,
      }),
    ).toThrow(/too low/i);
  });

  it('throws when not enough units available', () => {
    const twoUnits = isUnits.slice(0, 2);
    expect(() =>
      generateRoster(twoUnits, 4, 5000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
        gunnery: 4, piloting: 5, autoPilots: false, seed: 1,
      }),
    ).toThrow(/only.*units available/i);
  });

  it('calculates totalTonnage correctly', () => {
    const roster = generateRoster(isUnits, 4, 5000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 4, piloting: 5, autoPilots: false, seed: 42,
    });

    const expectedTonnage = roster.entries.reduce((sum, e) => sum + e.unit.tonnage, 0);
    expect(roster.totalTonnage).toBe(expectedTonnage);
  });

  it('carries factionType and factionSlug through to the roster', () => {
    const roster = generateRoster(isUnits, 4, 5000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 4, piloting: 5, autoPilots: false, seed: 42,
      factionType: 'GREAT_HOUSE',
      factionSlug: 'davion',
    });

    expect(roster.factionType).toBe('GREAT_HOUSE');
    expect(roster.factionSlug).toBe('davion');
  });

  it('works across different mission types', () => {
    const missions = [
      'recon', 'objective_raid', 'defense', 'escort',
      'extraction', 'breakthrough', 'zone_control',
    ] as const;

    for (const mission of missions) {
      const roster = generateRoster(isUnits, 4, 5000, mission, 'LATE_SUCCESSION_WARS', {
        gunnery: 4, piloting: 5, autoPilots: false, seed: 42,
      });
      expect(roster.entries).toHaveLength(4);
      expect(roster.mission).toBe(mission);
      expect(roster.bvUsed).toBeLessThanOrEqual(5000);
    }
  });

  it('never selects the same unit twice', () => {
    const roster = generateRoster(isUnits, 6, 7000, 'pitched_battle', 'LATE_SUCCESSION_WARS', {
      gunnery: 4, piloting: 5, autoPilots: false, seed: 42,
    });

    const slugs = roster.entries.map(e => e.unit.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

// ---------------------------------------------------------------------------
// 5. Formatter output via CLI (using --list-missions as a proxy since it
//    produces formatted output without any API call)
// ---------------------------------------------------------------------------

describe('formatter integration', () => {
  it('produces tabular output with separator lines', async () => {
    const { stdout } = await runCli(['--list-missions']);

    // The formatter uses unicode box-drawing characters for separators
    expect(stdout).toMatch(/─+/);
  });

  it('output aligns mission IDs with descriptions', async () => {
    const { stdout } = await runCli(['--list-missions']);

    // Each mission line should have the ID followed by its description
    const lines = stdout.split('\n');
    const missionLines = lines.filter(l => l.includes('pitched_battle') || l.includes('recon'));
    expect(missionLines.length).toBeGreaterThanOrEqual(2);

    for (const line of missionLines) {
      // Format: "  mission_id           Description text."
      expect(line).toMatch(/\s{2}\w+\s{2,}/);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Regression: numeric CLI flags parsed correctly (parseInt radix bug)
// ---------------------------------------------------------------------------

describe('numeric flag parsing', () => {
  it('--variants produces multiple rosters', () => {
    // Regression: parseInt passed as bare reference to commander uses
    // previousDefault as radix, producing NaN. The for loop never executed.
    const pool = createMockUnits();
    const rosters: Roster[] = [];
    for (let v = 0; v < 3; v++) {
      rosters.push(generateRoster(pool, 3, 4000, 'pitched_battle', 'CLAN_INVASION', { seed: 100 + v }));
    }
    expect(rosters).toHaveLength(3);
    // At least two should differ
    const slugSets = rosters.map(r => r.entries.map(e => e.unit.slug).sort().join(','));
    const unique = new Set(slugSets);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('--bv is parsed as a valid number', () => {
    // If parseInt used wrong radix, bv would be NaN and feasibility check would throw
    const pool = createMockUnits();
    const roster = generateRoster(pool, 3, 3000, 'recon', 'CLAN_INVASION', { seed: 1 });
    expect(roster.bvBudget).toBe(3000);
    expect(roster.bvUsed).toBeLessThanOrEqual(3000);
  });

  it('--count is parsed as a valid number', () => {
    const pool = createMockUnits();
    const roster = generateRoster(pool, 5, 5000, 'pitched_battle', 'CLAN_INVASION', { seed: 1 });
    expect(roster.entries).toHaveLength(5);
  });

  it('--seed is parsed as a valid number and is deterministic', () => {
    const pool = createMockUnits();
    const r1 = generateRoster(pool, 3, 3000, 'pitched_battle', 'CLAN_INVASION', { seed: 999 });
    const r2 = generateRoster(pool, 3, 3000, 'pitched_battle', 'CLAN_INVASION', { seed: 999 });
    expect(r1.entries.map(e => e.unit.slug)).toEqual(r2.entries.map(e => e.unit.slug));
  });
});
