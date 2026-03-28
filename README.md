# BattleTech Roster Builder

A mission-driven BattleTech Classic roster generator. Rather than randomly filling a BV bucket, it uses mission profiles to drive force composition -- selecting mechs by role and weight class to build rosters that make tactical sense for the scenario you are playing.

Built as a TypeScript monorepo with a shared core module, CLI tool, and React web app. Pulls unit data from the [BattleDroids](https://battledroids.ru) GraphQL API, which indexes approximately 6,500 BattleMech variants sourced from MegaMek.

## How It Works

1. **Mission profile** -- Each of the 8 mission types defines a distribution of combat roles (Brawler, Sniper, Striker, etc.) and weight classes (Light through Assault). A Recon mission favors Skirmishers and Strikers in Light and Medium mechs; a Defense mission leans toward Juggernauts and Snipers in Heavy and Assault mechs.

2. **Slot assignment** -- The generator divides the roster into slots, each with a target role, weight class, and BV share. Heavier weight classes receive a proportionally larger BV allocation (Assault gets a 1.35x factor, Light gets 0.70x).

3. **Unit selection** -- For each slot, the generator queries the unit pool with progressively relaxing filters: first exact role + exact weight class, then mission-relevant role + exact weight class, then any role in adjacent weight classes, widening BV tolerance bands (25%, 40%, 60%, 100%) until a valid unit is found. Heaviest slots fill first to prevent budget exhaustion before picking the big mechs.

4. **Pilot skill assignment** -- By default, pilots are auto-assigned based on tech base (Inner Sphere 4/5, Clan 3/4). Remaining BV headroom is spent upgrading individual pilot skills, prioritizing gunnery for fire-support roles and piloting for mobile roles.

5. **BV adjustment** -- All BV values are adjusted using the official TechManual skill multiplier table (p.315). A 4/5 pilot is the 1.00x baseline; better skills increase BV, worse skills decrease it.

## Web App

The web app provides a full browser-based interface for roster generation and collection management.

### Run locally

```bash
npm run web:dev
# Open http://localhost:5173
```

### Features

- **Roster generation** -- Select mission, BV budget, mech count, era, and optional filters (faction, tech base). Click Generate to build a roster with auto-assigned pilot skills. Generate multiple variants to compare.
- **Collections** -- Two types:
  - **Mech Pools** -- Curate a list of mechs (e.g. your miniature collection) and use it as the unit source for roster generation instead of querying the API.
  - **Saved Rosters** -- Save generated rosters with editable pilot skills and live adjusted BV totals.
- **Mech browser** -- Search the full BattleDroids database with filters (era, faction type, faction, tech base, role). Infinite scroll pagination. Add mechs to any collection.
- **Mech details** -- Click any mech name (in rosters, collections, or the browser) to expand an inline panel showing full loadout by location, armor distribution, engine, heat sinks, and quirks. Data is lazy-loaded from the API and cached.
- **Chassis proxy mode** -- Toggle per collection. When enabled, each mech represents any variant of its chassis during generation (for tabletop miniature proxying). The number of miniatures per chassis limits how many picks the generator can make. Collection view switches to a grouped chassis display showing name, tonnage, and mini count.
- **Collection-based generation** -- Select a mech pool as the unit source in the roster form. Generation is instant (no API fetch) unless chassis proxy needs to expand variants. Advanced filters (tech base, BV range) still apply client-side.
- **Export/Import** -- Save all collections to a JSON file for backup or transfer between devices. Import replaces all current collections (with confirmation when data exists).
- **Persistent UI state** -- Form fields, generated rosters, active tab, selected collection, and type filter all survive page refresh (sessionStorage).

### Tech stack

- React 19, Vite 8, TypeScript
- shadcn/ui (Radix + Tailwind CSS) with dark theme
- Imports `@bt-roster/core` directly -- same generation logic as CLI

## CLI

```bash
# Generate a roster
node --import tsx packages/cli/src/cli.ts \
  --mission pitched_battle --bv 6000 --count 4 \
  --era CLAN_INVASION --tech-base INNER_SPHERE

# Multiple variants
node --import tsx packages/cli/src/cli.ts \
  --mission defense --bv 5000 --count 3 \
  --era CLAN_INVASION --variants 3 --seed 42

# Discovery commands
node --import tsx packages/cli/src/cli.ts --list-missions
node --import tsx packages/cli/src/cli.ts --list-eras
node --import tsx packages/cli/src/cli.ts --list-factions --faction-type GREAT_HOUSE
```

### CLI Reference

```
Required:
  --mission       pitched_battle, recon, objective_raid, defense,
                  escort, extraction, breakthrough, zone_control
  --bv            Total BV budget
  --count         Number of mechs
  --era           AGE_OF_WAR, STAR_LEAGUE, EARLY_SUCCESSION_WARS,
                  LATE_SUCCESSION_WARS, RENAISSANCE, CLAN_INVASION,
                  CIVIL_WAR, JIHAD, DARK_AGE, IL_CLAN

Optional:
  --faction-type  GREAT_HOUSE, CLAN, PERIPHERY, MERCENARY, OTHER
  --faction       Specific faction slug (e.g. davion, clan-wolf)
  --tech-base     INNER_SPHERE, CLAN, MIXED, PRIMITIVE
  --rules-level   Max rules level (default: STANDARD)
  --pilot G/P     Fixed pilot skill (e.g. 3/4), disables auto-assignment
  --no-auto-pilots  All pilots stay at tech base baseline
  --variants N    Generate N different rosters (default: 1, max: 10)
  --seed          Random seed for reproducible output

Discovery:
  --list-missions   Show mission types
  --list-eras       Show available eras
  --list-factions   Show factions (filterable by --faction-type)
```

## Mission Types

| Mission | Description | Favors |
|---------|------------|--------|
| `pitched_battle` | Standard direct engagement | Juggernauts, Brawlers, Snipers. Medium/Heavy. |
| `recon` | Locate objectives, gather intel | Strikers, Skirmishers. Light/Medium. |
| `objective_raid` | Destroy turrets, buildings, infrastructure | Snipers, Missile Boats. Medium/Heavy. |
| `defense` | Hold a position against attackers | Juggernauts, Snipers, Missile Boats. Heavy/Assault. |
| `escort` | Protect convoy or VIP | Skirmishers, Brawlers, Strikers. Balanced. |
| `extraction` | Retrieve objective and bring it home | Strikers, Skirmishers. Light/Medium. |
| `breakthrough` | Escape through enemy lines | Brawlers, Skirmishers, Juggernauts. Medium/Heavy. |
| `zone_control` | Hold multiple objective points | Juggernauts, Skirmishers, Snipers. Medium/Heavy/Assault. |

## Pilot Skills

Pilot skills affect BV using the multiplier table from TechManual p.315.

**Tech base baselines:**

| Tech Base | Default Skill | Multiplier |
|-----------|--------------|------------|
| Inner Sphere | 4/5 (Regular) | 1.00x |
| Clan | 3/4 (Veteran) | 1.32x |

**Auto-assignment (default):** The generator picks mechs first, then spends remaining BV on pilot upgrades. Gunnery is prioritized for fire-support roles (Sniper, Missile Boat, Juggernaut); piloting for mobile roles (Striker, Skirmisher, Brawler). Skills cap at 2 minimum.

**Overrides:**
- `--pilot 3/4` -- Fixed skill for all mechs, disables auto-assignment.
- `--no-auto-pilots` -- All pilots stay at baseline (4/5 or 3/4).

## Rules Level Hierarchy

The `--rules-level` flag sets the maximum allowed rules level. The hierarchy is cumulative:

```
INTRODUCTORY < STANDARD < ADVANCED < EXPERIMENTAL
```

`UNOFFICIAL` is standalone and includes everything. Default is `STANDARD`. Clan tech auto-bumps to `ADVANCED`.

## Architecture

```
battletech-roster-builder/
  package.json                    # Root workspace configuration
  packages/
    core/                         # @bt-roster/core -- shared domain logic
      src/
        index.ts                  # Public API re-exports
        models.ts                 # Types, string literal unions, weight class utilities
        missions.ts               # 8 mission profiles, slot assignment algorithm
        pilots.ts                 # BV skill multiplier table, auto-assignment engine
        generator.ts              # Roster generation (seeded PRNG, multi-pass selection)
        api.ts                    # BattleDroids GraphQL client (paginated, rate-limited)
        utils.ts                  # Shared utilities (rules level bump, BV filter bounds)
      tests/                      # 85 tests
    cli/                          # @bt-roster/cli -- command-line interface
      src/
        cli.ts                    # Commander.js argument parsing
        formatter.ts              # Terminal table output
      tests/                      # 30 tests
    web/                          # @bt-roster/web -- React web app
      src/
        App.tsx                   # Main layout with Generate/Collections tabs
        components/
          RosterForm.tsx          # Mission, BV, count, era, filters, unit source
          RosterDisplay.tsx       # HTML table with expandable mech details
          RosterVariants.tsx      # Tab navigation for multiple variants
          CollectionList.tsx      # Browse/create/filter collections
          CollectionEditor.tsx    # Edit collection, pilot skills, chassis proxy
          MechBrowser.tsx         # Search mechs with API filters, infinite scroll
          MechDetailCard.tsx      # Lazy-loaded mech info (loadout, armor, quirks)
          SaveRosterDialog.tsx    # Save roster as collection
          LoadingOverlay.tsx      # Progress bar during API fetch
          ErrorBanner.tsx         # Error display
        hooks/
          useFormState.ts         # Form state via useReducer
          useReferenceData.ts     # Fetches eras/factions on mount
          useRosterGenerator.ts   # Fetch + generate pipeline
          useCollections.ts       # Collection CRUD + localStorage sync
        services/
          collections.ts          # localStorage persistence for collections
      tests/                      # 18 tests
```

### Package Responsibilities

**@bt-roster/core** -- Zero-dependency shared module containing all domain logic: data models, mission profiles, pilot skill calculations, roster generation algorithm, and BattleDroids API client. Works in both Node.js and browser.

**@bt-roster/cli** -- Command-line interface built on Commander.js. Handles argument parsing, progress output, and tabular formatting.

**@bt-roster/web** -- React 19 SPA with shadcn/ui components and Tailwind CSS dark theme. Roster generation, collections management, mech browsing with detail views.

## Development

### Installation

```bash
git clone <repo-url>
cd battletech-roster-builder
npm install
```

### Running

```bash
# Web app (dev server with API proxy)
npm run web:dev

# CLI
node --import tsx packages/cli/src/cli.ts --list-missions

# Production build
npm run web:build
```

### Running Tests

```bash
# All core tests (85 tests)
npm test

# CLI integration tests (30 tests)
npm -w @bt-roster/cli test

# Web tests (18 tests)
npm -w @bt-roster/web test

# Watch mode
npm -w @bt-roster/core run test:watch
```

133 tests total. Tests use [Vitest](https://vitest.dev/).

### Tech Stack

- **TypeScript** -- Strict mode, ESM throughout.
- **npm workspaces** -- Monorepo linking.
- **tsx** -- TypeScript execution without compile step.
- **Commander.js** -- CLI argument parsing.
- **React 19** -- Web UI framework.
- **Vite 8** -- Web build tool with CORS proxy for development.
- **shadcn/ui** -- Component library (Radix primitives + Tailwind CSS).
- **Vitest** -- Test runner across all packages.

## Data Source

All unit data comes from the [BattleDroids GraphQL API](https://api.battledroids.ru/graphql), which indexes BattleMech data from [MegaMek](https://megamek.org/). The API is queried at runtime -- no local unit database is bundled.

Era filter is cumulative -- selecting "Clan Invasion" includes all mechs available up to and including that era.
