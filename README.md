# BattleTech Roster Builder

A mission-driven BattleTech Classic roster generator. Rather than randomly filling a BV bucket, it uses mission profiles to drive force composition -- selecting mechs by role and weight class to build rosters that make tactical sense for the scenario you are playing.

Built as a TypeScript monorepo. Pulls unit data from the [BattleDroids](https://battledroids.ru) GraphQL API, which indexes approximately 6,500 BattleMech variants sourced from MegaMek.

## How It Works

1. **Mission profile** -- Each of the 8 mission types defines a distribution of combat roles (Brawler, Sniper, Striker, etc.) and weight classes (Light through Assault). A Recon mission favors Skirmishers and Strikers in Light and Medium mechs; a Defense mission leans toward Juggernauts and Snipers in Heavy and Assault mechs.

2. **Slot assignment** -- The generator divides the roster into slots, each with a target role, weight class, and BV share. Heavier weight classes receive a proportionally larger BV allocation (Assault gets a 1.35x factor, Light gets 0.70x).

3. **Unit selection** -- For each slot, the generator queries the unit pool with progressively relaxing filters: first exact role + exact weight class, then mission-relevant role + exact weight class, then any role in adjacent weight classes, widening BV tolerance bands (25%, 40%, 60%, 100%) until a valid unit is found. Heaviest slots fill first to prevent budget exhaustion before picking the big mechs.

4. **Pilot skill assignment** -- By default, pilots are auto-assigned based on tech base (Inner Sphere 4/5, Clan 3/4). Remaining BV headroom is spent upgrading individual pilot skills, prioritizing gunnery for fire-support roles and piloting for mobile roles.

5. **BV adjustment** -- All BV values are adjusted using the official TechManual skill multiplier table (p.315). A 4/5 pilot is the 1.00x baseline; better skills increase BV, worse skills decrease it.

## Example Output

```
$ node --import tsx packages/cli/src/cli.ts \
    --mission pitched_battle --bv 6000 --count 4 \
    --era CLAN_INVASION --tech-base INNER_SPHERE --seed 7

 BATTLETECH ROSTER -- Pitched Battle
 Era: Clan Invasion
 BV Budget: 6000 | BV Used: 5994 (99.9%) | Remaining: 6
 ─────────────────────────────────────────────────────────────────────────
  #  Unit Name              Variant    Tons  Pilot    BV  Adj BV  Role
 ─────────────────────────────────────────────────────────────────────────
  1  Orion ON1-VA           ON1-VA       75    4/5  1328    1328  Juggernaut
  2  Flashman FLS-7K        FLS-7K       75    4/2  1480    1865  Brawler
  3  Shadow Hawk SHD-2K     SHD-2K       55    4/4  1147    1262  Sniper
  4  Viper VP-5             VP-5         70    4/5  1539    1539  Brawler
 ─────────────────────────────────────────────────────────────────────────
     TOTAL                              275         5494    5994
```

## Installation

Requires **Node.js 18+**.

```bash
git clone <repo-url>
cd battletech-roster-builder
npm install
```

The `npm install` at the root handles all workspace dependencies automatically.

## CLI Usage

Run the CLI via the workspace script or with `tsx` directly:

```bash
# Via npm script
npm run bt-roster -- --mission pitched_battle --bv 8000 --count 4 --era CLAN_INVASION

# Via tsx directly
node --import tsx packages/cli/src/cli.ts --mission pitched_battle --bv 8000 --count 4 --era CLAN_INVASION
```

### Required Flags

| Flag | Description |
|------|-------------|
| `--mission <type>` | Mission type (see mission types table below) |
| `--bv <number>` | Total BV budget for the roster |
| `--count <number>` | Number of mechs in the roster |
| `--era <era>` | Era filter for available units |

### Optional Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--faction-type <type>` | -- | Filter by faction type: `GREAT_HOUSE`, `CLAN`, `PERIPHERY`, `MERCENARY`, `OTHER` |
| `--faction <slug>` | -- | Filter by specific faction slug (e.g. `davion`, `clan-wolf`) |
| `--tech-base <base>` | -- | Filter by tech base: `INNER_SPHERE`, `CLAN`, `MIXED`, `PRIMITIVE` |
| `--rules-level <level>` | `STANDARD` | Maximum rules level: `INTRODUCTORY`, `STANDARD`, `ADVANCED`, `EXPERIMENTAL`, `UNOFFICIAL` |
| `--pilot <g/p>` | -- | Fixed pilot skill for all mechs (e.g. `3/4`). Disables auto-assignment |
| `--no-auto-pilots` | -- | Disable auto pilot skill assignment (all pilots stay at baseline) |
| `--seed <number>` | -- | Random seed for reproducible rosters |
| `--variants <number>` | `1` | Generate N roster variants (max 10) |

### Discovery Commands

```bash
# List all mission types with descriptions
node --import tsx packages/cli/src/cli.ts --list-missions

# List all available eras
node --import tsx packages/cli/src/cli.ts --list-eras

# List all factions (optionally filtered by type)
node --import tsx packages/cli/src/cli.ts --list-factions
node --import tsx packages/cli/src/cli.ts --list-factions --faction-type CLAN
```

### Examples

**Basic roster generation:**

```bash
node --import tsx packages/cli/src/cli.ts \
  --mission pitched_battle --bv 8000 --count 4 --era CLAN_INVASION
```

**With faction and tech base filters:**

```bash
node --import tsx packages/cli/src/cli.ts \
  --mission defense --bv 10000 --count 6 --era DARK_AGE \
  --faction-type GREAT_HOUSE --tech-base INNER_SPHERE
```

**Multiple variants for comparison:**

```bash
node --import tsx packages/cli/src/cli.ts \
  --mission recon --bv 5000 --count 4 --era LATE_SUCCESSION_WARS \
  --variants 3
```

**Fixed pilot skills (disables auto-assignment):**

```bash
node --import tsx packages/cli/src/cli.ts \
  --mission pitched_battle --bv 6000 --count 4 --era CLAN_INVASION \
  --pilot 3/4
```

**Clan forces (auto-bumps rules level to Advanced):**

```bash
node --import tsx packages/cli/src/cli.ts \
  --mission breakthrough --bv 8000 --count 4 --era CLAN_INVASION \
  --tech-base CLAN
```

When `--tech-base CLAN` is specified and the rules level is Introductory or Standard, the CLI automatically bumps it to Advanced, since Clan technology is not available at lower rules levels.

**Reproducible roster with seed:**

```bash
node --import tsx packages/cli/src/cli.ts \
  --mission pitched_battle --bv 6000 --count 4 --era CLAN_INVASION \
  --tech-base INNER_SPHERE --seed 42
```

Using the same seed with the same filters produces identical output every time.

## Mission Types

All 8 mission types are derived from standard BattleTech tabletop scenarios. Each defines weighted distributions for combat roles and mech weight classes.

| Mission | Description | Favored Roles | Weight Bias |
|---------|-------------|---------------|-------------|
| `pitched_battle` | Standard direct engagement -- destroy or rout the enemy | Juggernaut, Brawler, Sniper, Missile Boat, Skirmisher | Heavy, Medium, Assault |
| `recon` | Locate hidden objectives, search buildings, gather intel | Skirmisher, Striker, Sniper | Light, Medium |
| `objective_raid` | Destroy installations, turrets, buildings, infrastructure | Sniper, Missile Boat, Striker, Brawler | Medium, Heavy |
| `defense` | Hold a position, protect buildings or installations | Juggernaut, Sniper, Missile Boat, Brawler | Assault, Heavy |
| `escort` | Protect a convoy or VIP mech moving across the map | Skirmisher, Brawler, Striker, Juggernaut | Medium, Heavy |
| `extraction` | Retrieve an objective/unit and bring it back to your edge | Striker, Skirmisher, Brawler, Sniper | Medium, Light |
| `breakthrough` | Escape through enemy lines with as many units as possible | Brawler, Skirmisher, Juggernaut, Striker | Heavy, Medium, Assault |
| `zone_control` | Hold multiple objective points spread across the map | Juggernaut, Skirmisher, Sniper, Brawler (even 25% each) | Medium, Heavy, Assault |

## Pilot Skills

### Tech Base Baselines

| Tech Base | Gunnery/Piloting | BV Multiplier | Description |
|-----------|-----------------|---------------|-------------|
| Inner Sphere | 4/5 | 1.00x | Standard baseline (Regular) |
| Clan | 3/4 | 1.32x | Clan frontline standard (Veteran) |
| Mixed | 4/5 | 1.00x | Same as Inner Sphere |
| Primitive | 4/5 | 1.00x | Same as Inner Sphere |

### Auto-Assignment Logic

When auto-pilot assignment is enabled (the default), the generator:

1. Sets each pilot to the baseline for its unit's tech base.
2. Calculates remaining BV headroom (budget minus current total).
3. Greedily upgrades the cheapest beneficial skill improvement, factoring in role affinity:
   - **Gunnery priority** (1.2x selection weight): Sniper, Missile Boat, Juggernaut -- these roles benefit most from hitting harder.
   - **Piloting priority** (1.2x selection weight): Striker, Skirmisher, Brawler, Scout -- these roles benefit most from maneuverability and avoiding falls.
4. Skills are capped at a minimum of 2 (no pilot goes below Gunnery 2 or Piloting 2).
5. Repeats until no further upgrade fits within the remaining BV.

### BV Multiplier Reference

Pilot skills adjust the unit's base BV according to the TechManual skill multiplier table (p.315). Selected reference points:

| Gunnery/Piloting | Multiplier |
|------------------|------------|
| 0/0 | 2.42x |
| 2/3 | 1.44x |
| 3/4 | 1.32x |
| 4/5 | 1.00x (baseline) |
| 5/6 | 0.86x |
| 8/8 | 0.64x |

The full table covers all 81 combinations from 0/0 through 8/8.

### Overriding Auto-Assignment

- `--pilot 3/4` -- Sets a fixed Gunnery 3 / Piloting 4 for all mechs and disables auto-assignment.
- `--no-auto-pilots` -- Disables the upgrade loop; all pilots stay at their tech base baseline (4/5 for IS, 3/4 for Clan).

## Rules Level Hierarchy

The `--rules-level` flag sets the maximum allowed rules level. The hierarchy is cumulative -- setting a level allows that level and everything below it:

```
INTRODUCTORY < STANDARD < ADVANCED < EXPERIMENTAL
```

`UNOFFICIAL` is a standalone category. When selected, it allows all four hierarchical levels plus unofficial units.

The default is `STANDARD` (includes Introductory and Standard units). When `--tech-base CLAN` is used, the CLI automatically bumps the rules level to at least `ADVANCED`, since Clan technology is not available at Introductory or Standard levels.

## Architecture

```
battletech-roster-builder/
  package.json                  # Root workspace configuration
  packages/
    core/                       # @bt-roster/core -- shared domain logic
      src/
        index.ts                # Public API re-exports
        models.ts               # Types, string literal unions, weight class utilities
        missions.ts             # 8 mission profiles, slot assignment algorithm
        pilots.ts               # BV skill multiplier table, auto-assignment engine
        generator.ts            # Roster generation (seeded PRNG, multi-pass unit selection)
        api.ts                  # BattleDroids GraphQL client (paginated, rate-limited)
      tests/
        models.test.ts          # Weight class and rules level tests
        missions.test.ts        # Slot assignment tests
        pilots.test.ts          # Skill multiplier and auto-assignment tests
        generator.test.ts       # End-to-end roster generation tests
        api.test.ts             # API client tests
    cli/                        # @bt-roster/cli -- command-line interface
      src/
        cli.ts                  # Commander.js argument parsing, orchestration
        formatter.ts            # Tabular output formatting for rosters and discovery lists
```

### Package Responsibilities

**@bt-roster/core** -- Zero-dependency shared module containing all domain logic: data models, mission profiles, pilot skill calculations, the roster generation algorithm, and the BattleDroids API client. Designed to be imported by any consumer.

**@bt-roster/cli** -- Command-line interface built on [Commander.js](https://github.com/tj/commander.js). Handles argument parsing, progress output to stderr, and tabular formatting to stdout. Depends on `@bt-roster/core`.

**Future packages** -- The monorepo structure is designed to support additional consumers such as `@bt-roster/web` (browser UI) and `@bt-roster/bot` (Discord/Slack bot), all sharing the core library.

## Development

### Running Tests

```bash
# Run all core tests
npm test

# Run tests in watch mode
npm -w @bt-roster/core run test:watch
```

Tests use [Vitest](https://vitest.dev/).

### Tech Stack

- **TypeScript 5.7+** -- All packages use strict TypeScript with ESM (`"type": "module"`).
- **npm workspaces** -- The root `package.json` links `@bt-roster/core` into `@bt-roster/cli` automatically.
- **tsx** -- TypeScript loader for direct execution without a compile step.
- **Commander.js** -- CLI argument parsing.
- **Vitest** -- Test runner.

## Data Source

All unit data comes from the [BattleDroids GraphQL API](https://api.battledroids.ru/graphql), which indexes BattleMech data from [MegaMek](https://megamek.org/). The API is queried at runtime -- no local unit database is bundled or required.

The CLI fetches units in pages of 100, with a 500ms delay between pages to respect API rate limits. Smart BV pre-filtering narrows the query range to avoid fetching units that could never fit the budget.

## License

See [LICENSE](LICENSE) for details.
