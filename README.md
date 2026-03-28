# BattleTech Roster Builder

A mission-driven roster generator for BattleTech Classic tabletop. Queries the [BattleDroids API](https://api.battledroids.ru/llms.txt) (~6,500 units from MegaMek) and builds tactically coherent rosters based on mission type, BV budget, era, faction, and pilot skills.

## How It Works

Unlike random BV bucket-filling, the generator selects units based on **what the mission actually needs**:

1. **Mission profile** defines role distribution (Juggernaut, Sniper, Striker, etc.) and weight class bias
2. **Slots are assigned** — each slot gets a target role + weight class, scaled to any unit count
3. **BV is distributed proportionally** — assault slots get more budget than medium slots
4. **Heaviest slots fill first** — prevents budget exhaustion before picking the big mechs
5. **Pilot skills auto-assigned** — IS pilots start at 4/5 (Regular), Clan at 3/4 (Veteran), then remaining BV is spent on upgrades prioritized by role

## Example Output

```
$ bt-roster --mission pitched_battle --bv 6000 --count 4 --era CLAN_INVASION --tech-base INNER_SPHERE

 BATTLETECH ROSTER — Pitched Battle
 Era: Clan Invasion
 BV Budget: 6000 | BV Used: 5994 (99.9%) | Remaining: 6
 ─────────────────────────────────────────────────────────────────────
 #  Unit Name           Variant  Tons  Pilot    BV  Adj BV  Role
 ─────────────────────────────────────────────────────────────────────
 1  Orion ON1-VA        ON1-VA     75    4/5  1328    1328  Juggernaut
 2  Flashman FLS-7K     FLS-7K     75    4/2  1480    1865  Brawler
 3  Shadow Hawk SHD-2K  SHD-2K     55    4/4  1147    1262  Sniper
 4  Viper VP-5          VP-5       70    4/5  1539    1539  Brawler
 ─────────────────────────────────────────────────────────────────────
    TOTAL                         275         5494    5994
```

## Installation

Requires Python 3.12+. No external dependencies.

```bash
git clone <repo-url>
cd battletech-roster-builder
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Usage

```bash
# Generate a roster
bt-roster --mission pitched_battle --bv 8000 --count 4 --era CLAN_INVASION

# With faction and tech base filters
bt-roster --mission defense --bv 10000 --count 6 --era DARK_AGE --faction davion --tech-base INNER_SPHERE

# Multiple variants to choose from
bt-roster --mission zone_control --bv 5000 --count 4 --era CLAN_INVASION --variants 3

# Fixed pilot skills (disables auto-assignment)
bt-roster --mission recon --bv 4000 --count 3 --era LATE_SUCCESSION_WARS --pilot 3/4

# Reproducible roster with seed
bt-roster --mission escort --bv 7000 --count 5 --era JIHAD --seed 42

# Clan forces (auto-bumps rules level to Advanced, pilots start at 3/4)
bt-roster --mission pitched_battle --bv 8000 --count 4 --era CLAN_INVASION --tech-base CLAN

# Discover available options
bt-roster --list-missions
bt-roster --list-eras
bt-roster --list-factions --faction-type GREAT_HOUSE
```

## Mission Types

Derived from actual BattleTech tabletop scenarios.

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

Pilot skills affect BV using the multiplier table from TechManual p.315. Standard 4/5 pilot = 1.00x multiplier.

**Auto-assignment (default):** The generator picks mechs first, then spends remaining BV on pilot upgrades:
- Gunnery upgrades prioritized for fire-support roles (Sniper, Missile Boat, Juggernaut)
- Piloting upgrades prioritized for mobile roles (Striker, Skirmisher, Brawler)
- Skills capped at 2 minimum (veteran floor)

**Baselines by tech base:**
- Inner Sphere: 4/5 (Regular)
- Clan: 3/4 (Veteran — frontline standard)

**Override options:**
- `--pilot 3/4` — fixed skill for all mechs, disables auto-assignment
- `--no-auto-pilots` — all pilots stay at default baseline (4/5 or 3/4)

## Rules Level Filtering

Rules levels are hierarchical — each level includes all levels below it:

```
INTRODUCTORY < STANDARD < ADVANCED < EXPERIMENTAL
```

Default is `STANDARD` (includes Introductory). Clan tech requires Advanced — auto-adjusted when `--tech-base CLAN` is used. `UNOFFICIAL` is standalone and must be explicitly chosen.

## CLI Reference

```
Required:
  --mission       Mission type
  --bv            Total BV budget
  --count         Number of mechs
  --era           Era

Optional filters:
  --faction-type  GREAT_HOUSE, CLAN, PERIPHERY, MERCENARY, OTHER
  --faction       Specific faction slug (e.g. davion, clan-wolf)
  --tech-base     INNER_SPHERE, CLAN, MIXED, PRIMITIVE
  --rules-level   Max rules level (default: STANDARD)

Pilot skills:
  --pilot G/P         Fixed skill for all mechs (e.g. 3/4)
  --no-auto-pilots    Disable auto pilot assignment

Output:
  --variants N    Generate N different rosters (default: 1, max: 10)
  --seed INT      Random seed for reproducible output

Discovery:
  --list-missions     Show mission types
  --list-eras         Show available eras
  --list-factions     Show factions (filterable by --faction-type)
```

## Project Structure

```
battletech-roster-builder/
  pyproject.toml
  src/
    bt_roster/              # Core module — reusable by CLI, web, and bot
      models.py             # Enums, dataclasses, exceptions
      missions.py           # Mission profiles (role/weight distributions)
      pilots.py             # BV skill multiplier table + auto-assignment
      api.py                # BattleDroids GraphQL client with pagination
      generator.py          # Roster generation algorithm
      formatter.py          # Terminal table rendering
      cli.py                # argparse CLI entry point
```

The `bt_roster` module is designed for reuse. Only `cli.py` is CLI-specific — the core logic (API client, generator, missions, pilots, formatter) will be shared by the upcoming Telegram bot and web interface.

## Data Source

All unit data comes from the [BattleDroids API](https://api.battledroids.ru/graphql) — a GraphQL API serving ~6,500 units from MegaMek 0.50.11, enriched with Master Unit List data.
