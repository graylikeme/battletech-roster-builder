# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BattleTech Roster Builder is a TypeScript monorepo that generates tactical BattleTech unit rosters optimized for specific mission profiles. It pulls unit data from the BattleDroids GraphQL API (~6,500 MegaMek variants) at runtime and uses mission-driven force composition to select mechs by role and weight class.

## Commands

```bash
# Install dependencies (npm workspaces handle linking)
npm install

# Run the CLI
npm run bt-roster -- --mission pitched_battle --bv 8000 --count 4 --era CLAN_INVASION

# Run core tests (75+ tests)
npm test

# Run CLI integration tests (30+ tests)
npm -w @bt-roster/cli test

# Run a single test file
npx -w @bt-roster/core vitest run tests/generator.test.ts
npx -w @bt-roster/cli vitest run tests/cli.test.ts

# Watch mode
npm -w @bt-roster/core run test:watch
```

No build step required -- `tsx` executes TypeScript directly.

## Architecture

**npm workspaces monorepo** with two packages:

- **`packages/core/`** (`@bt-roster/core`) -- Zero-dependency domain logic: models, mission profiles, pilot skills, roster generation algorithm, GraphQL API client. Designed to be consumed by any future package (web UI, bot, etc.).
- **`packages/cli/`** (`@bt-roster/cli`) -- Commander.js CLI that parses flags, calls core, and formats tabular output. Depends on `@bt-roster/core`.

### Core module responsibilities

| Module | Purpose |
|--------|---------|
| `models.ts` | String literal unions (not enums) for eras, missions, roles, weight classes, factions, tech bases, rules levels. Key interfaces: `Unit`, `RosterEntry`, `Roster`, `UnitFilters`. Weight class utilities. |
| `missions.ts` | 8 mission profiles mapping mission type to role weights + weight class distributions. `assignSlots()` distributes roles/weights proportionally, applies BV weight-class factors (Assault 1.35x, Light 0.70x), sorts heaviest-first. |
| `pilots.ts` | 9x9 BV skill multiplier table (TechManual p.315). Tech base baselines (IS: 4/5, Clan: 3/4). Greedy auto-upgrade engine with role-based priority (gunnery for fire-support, piloting for mobile roles). Skill floor of 2. |
| `generator.ts` | Mulberry32 seeded PRNG. Multi-pass slot filling with progressive filter relaxation (6 passes x 4 BV tolerance bands). Unit pool sorted by slug for cross-machine determinism. |
| `api.ts` | Paginated GraphQL client for BattleDroids API (100/page, 500ms rate limit). Rules level filtering is client-side. Progress callback for CLI. |

### Key design decisions

- **String literal unions over enums** -- all type constants are `as const` arrays with derived union types.
- **Deterministic generation** -- same seed + same filters = identical roster. Requires unit pool sorted by slug before selection.
- **Separation of concerns** -- core has zero dependencies; all I/O and formatting live in CLI.
- **Progressive relaxation** -- slot filling widens from exact role+weight match to any role in adjacent weight class, preventing empty slots.

## TypeScript Configuration

- Target: ES2022, Module: Node16, Strict mode
- ESM throughout (`"type": "module"` in all package.json files)
- No compile step; `tsx` loader used for direct execution
