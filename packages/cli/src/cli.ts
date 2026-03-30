#!/usr/bin/env node

import { Command } from 'commander';
import {
  ERAS, MISSIONS, FACTION_TYPES, TECH_BASES, RULES_LEVELS,
  type Era, type Mission, type FactionType, type TechBase, type RulesLevel, type UnitFilters,
  fetchUnits, fetchEras, fetchFactions,
  generateRoster,
  computeBvFilterBounds,
} from '@bt-roster/core';
import { formatRoster, formatMissionsList, formatErasList, formatFactionsList } from './formatter.js';

function parsePilot(value: string): [number, number] {
  const parts = value.split('/');
  if (parts.length !== 2) throw new Error(`Invalid pilot skill '${value}'. Use format G/P (e.g. 3/4).`);
  const g = parseInt(parts[0], 10);
  const p = parseInt(parts[1], 10);
  if (isNaN(g) || isNaN(p) || g < 0 || g > 8 || p < 0 || p > 8) {
    throw new Error(`Invalid pilot skill '${value}'. Values must be 0-8.`);
  }
  return [g, p];
}

const program = new Command();

program
  .name('bt-roster')
  .description('BattleTech Classic roster builder')
  .option('--list-missions', 'Show available mission types')
  .option('--list-eras', 'Show available eras')
  .option('--list-factions', 'Show available factions')
  .option('--mission <type>', `Mission type: ${MISSIONS.join(', ')}`)
  .option('--bv <number>', 'Total BV budget', (v: string) => parseInt(v, 10))
  .option('--count <number>', 'Number of mechs', (v: string) => parseInt(v, 10))
  .option('--era <era>', `Era: ${ERAS.join(', ')}`)
  .option('--faction-type <type>', `Faction type: ${FACTION_TYPES.join(', ')}`)
  .option('--faction <slug>', 'Specific faction slug (e.g. davion, clan-wolf)')
  .option('--tech-base <base>', `Tech base: ${TECH_BASES.join(', ')}`)
  .option('--rules-level <level>', `Max rules level (default: STANDARD): ${RULES_LEVELS.join(', ')}`, 'STANDARD')
  .option('--pilot <g/p>', 'Fixed pilot skill for all mechs (e.g. 3/4). Disables auto-assignment.')
  .option('--no-auto-pilots', 'Disable auto pilot skill assignment (all pilots stay at 4/5)')
  .option('--seed <number>', 'Random seed for reproducible rosters', (v: string) => parseInt(v, 10))
  .option('--variants <number>', 'Generate N roster variants (default: 1, max: 10)', (v: string) => parseInt(v, 10), 1)
  .action(run);

async function run(opts: Record<string, unknown>) {
  try {
    if (opts.listMissions) {
      console.log(formatMissionsList());
      return;
    }

    if (opts.listEras) {
      const eras = await fetchEras();
      console.log(formatErasList(eras));
      return;
    }

    if (opts.listFactions) {
      const ft = opts.factionType as FactionType | undefined;
      const factions = await fetchFactions(ft);
      console.log(formatFactionsList(factions));
      return;
    }

    // Validate required args
    const missing: string[] = [];
    if (!opts.mission) missing.push('--mission');
    if (!opts.bv) missing.push('--bv');
    if (!opts.count) missing.push('--count');
    if (!opts.era) missing.push('--era');
    if (missing.length > 0) {
      console.error(`Error: required arguments: ${missing.join(', ')}`);
      console.error('Use --list-missions, --list-eras, --list-factions to see options.');
      process.exit(1);
    }

    const mission = opts.mission as Mission;
    const era = opts.era as Era;
    const bv = opts.bv as number;
    const count = opts.count as number;
    const factionType = opts.factionType as FactionType | undefined;
    const techBase = opts.techBase as TechBase | undefined;
    const rulesLevel = opts.rulesLevel as RulesLevel;

    // Pilot skills
    let gunnery = 4, piloting = 5;
    let autoPilots = opts.autoPilots !== false;
    if (opts.pilot) {
      [gunnery, piloting] = parsePilot(opts.pilot as string);
      autoPilots = false;
    }

    // Smart BV pre-filtering
    const { bvMin, bvMax } = computeBvFilterBounds(bv, count);

    const filters: UnitFilters = {
      era,
      factionType,
      factionSlug: opts.faction as string | undefined,
      unitType: 'MECH',
      techBase,
      maxRulesLevel: rulesLevel,
      bvMin,
      bvMax,
    };

    const units = await fetchUnits(filters, (p) => {
      process.stderr.write(`\rFetching units... page ${p.page} (${p.fetched}/${p.total})`);
    });
    process.stderr.write(`\rFetched ${units.length} units.${' '.repeat(20)}\n`);

    if (units.length === 0) {
      console.error('No units found matching your filters. Try broadening era, faction, or BV range.');
      process.exit(1);
    }

    const numVariants = Math.max(1, Math.min(opts.variants as number ?? 1, 10));

    for (let v = 0; v < numVariants; v++) {
      const variantSeed = opts.seed != null ? (opts.seed as number) + v : undefined;

      const roster = generateRoster(units, count, bv, mission, era, {
        gunnery,
        piloting,
        autoPilots,
        factionType,
        factionSlug: opts.faction as string | undefined,
        seed: variantSeed,
      });

      if (numVariants > 1) console.log(`\n === Variant ${v + 1}/${numVariants} ===`);
      console.log(formatRoster(roster));
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

await program.parseAsync();
