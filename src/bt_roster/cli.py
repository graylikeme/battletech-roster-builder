"""CLI entry point — argparse wiring and main()."""

from __future__ import annotations

import argparse
import sys

from bt_roster.models import (
    BtRosterError,
    Era,
    FactionType,
    Mission,
    TechBase,
    RulesLevel,
    UnitFilters,
    UnitType,
)


def _parse_pilot(value: str) -> tuple[int, int]:
    """Parse 'G/P' string like '3/4' into (gunnery, piloting)."""
    try:
        parts = value.split("/")
        g, p = int(parts[0]), int(parts[1])
        if not (0 <= g <= 8 and 0 <= p <= 8):
            raise ValueError
        return g, p
    except (ValueError, IndexError):
        raise argparse.ArgumentTypeError(
            f"Invalid pilot skill '{value}'. Use format G/P (e.g. 3/4), values 0-8."
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bt-roster",
        description="BattleTech Classic roster builder",
    )

    # List commands
    list_group = parser.add_argument_group("list commands")
    list_group.add_argument("--list-missions", action="store_true", help="Show available mission types")
    list_group.add_argument("--list-eras", action="store_true", help="Show available eras")
    list_group.add_argument("--list-factions", action="store_true", help="Show available factions")

    # Roster generation
    gen_group = parser.add_argument_group("roster generation")
    gen_group.add_argument("--mission", type=str, choices=[m.value for m in Mission], help="Mission type")
    gen_group.add_argument("--bv", type=int, help="Total BV budget")
    gen_group.add_argument("--count", type=int, help="Number of mechs")
    gen_group.add_argument("--era", type=str, choices=[e.value for e in Era], help="Era")

    # Filters
    filter_group = parser.add_argument_group("filters")
    filter_group.add_argument("--faction-type", type=str, choices=[f.value for f in FactionType], help="Faction type")
    filter_group.add_argument("--faction", type=str, help="Specific faction slug (e.g. davion, clan-wolf)")
    filter_group.add_argument("--tech-base", type=str, choices=[t.value for t in TechBase], help="Tech base")
    filter_group.add_argument(
        "--rules-level", type=str,
        choices=[r.value for r in RulesLevel],
        default="STANDARD",
        help="Max rules level — includes all levels up to this (default: STANDARD). UNOFFICIAL must be explicitly chosen.",
    )

    # Pilots
    pilot_group = parser.add_argument_group("pilot skills")
    pilot_group.add_argument("--pilot", type=_parse_pilot, metavar="G/P",
        help="Fixed pilot skill for all mechs (e.g. 3/4). Disables auto-assignment.")
    pilot_group.add_argument("--no-auto-pilots", action="store_true",
        help="Disable auto pilot skill assignment (all pilots stay at 4/5)")

    # Other
    parser.add_argument("--seed", type=int, help="Random seed for reproducible rosters")
    parser.add_argument("--variants", type=int, default=1, metavar="N",
        help="Generate N roster variants (default: 1, max: 10)")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    try:
        _run(args)
    except BtRosterError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nAborted.", file=sys.stderr)
        sys.exit(130)


def _run(args: argparse.Namespace) -> None:
    from bt_roster import api
    from bt_roster.formatter import (
        format_eras_list,
        format_factions_list,
        format_missions_list,
        print_roster,
    )
    from bt_roster.generator import generate_roster

    # List commands
    if args.list_missions:
        print(format_missions_list())
        return

    if args.list_eras:
        eras = api.fetch_eras()
        print(format_eras_list(eras))
        return

    if args.list_factions:
        ft = FactionType(args.faction_type) if args.faction_type else None
        factions = api.fetch_factions(faction_type=ft)
        print(format_factions_list(factions))
        return

    # Validate required args for roster generation
    missing = []
    if not args.mission:
        missing.append("--mission")
    if not args.bv:
        missing.append("--bv")
    if not args.count:
        missing.append("--count")
    if not args.era:
        missing.append("--era")
    if missing:
        print(f"Error: required arguments for roster generation: {', '.join(missing)}", file=sys.stderr)
        print("Use --list-missions, --list-eras, --list-factions to see options.", file=sys.stderr)
        sys.exit(1)

    mission = Mission(args.mission)
    era = Era(args.era)
    faction_type = FactionType(args.faction_type) if args.faction_type else None
    tech_base = TechBase(args.tech_base) if args.tech_base else None
    max_rules_level = RulesLevel(args.rules_level)

    # Clan tech is all "advanced" — auto-bump rules level if needed
    if tech_base == TechBase.CLAN and max_rules_level in (RulesLevel.INTRODUCTORY, RulesLevel.STANDARD):
        max_rules_level = RulesLevel.ADVANCED
        print("Note: Clan tech requires Advanced rules level, auto-adjusted.", file=sys.stderr)

    # Pilot skills — auto-assign by default
    gunnery, piloting = 4, 5
    auto_pilots = True
    if args.pilot:
        gunnery, piloting = args.pilot
        auto_pilots = False
    elif args.no_auto_pilots:
        auto_pilots = False

    # Smart BV pre-filtering
    bv_min = max(1, int(args.bv / args.count * 0.15))
    bv_max = args.bv - (args.count - 1)

    filters = UnitFilters(
        era=era,
        faction_type=faction_type,
        faction_slug=args.faction,
        unit_type=UnitType.MECH,
        tech_base=tech_base,
        max_rules_level=max_rules_level,
        bv_min=bv_min,
        bv_max=bv_max,
    )

    units = api.fetch_units(filters)
    if not units:
        print("No units found matching your filters. Try broadening era, faction, or BV range.", file=sys.stderr)
        sys.exit(1)

    num_variants = max(1, min(args.variants, 10))

    for v in range(num_variants):
        # Each variant gets a different seed derived from the base seed
        if args.seed is not None:
            variant_seed = args.seed + v
        else:
            variant_seed = None

        roster = generate_roster(
            units=units,
            count=args.count,
            bv_budget=args.bv,
            mission=mission,
            era=era,
            gunnery=gunnery,
            piloting=piloting,
            auto_pilots=auto_pilots,
            faction_type=faction_type,
            faction_slug=args.faction,
            seed=variant_seed,
        )

        if num_variants > 1:
            print(f"\n === Variant {v + 1}/{num_variants} ===")
        print_roster(roster)
