"""Terminal table rendering for rosters."""

from __future__ import annotations

from bt_roster.models import Roster
from bt_roster.missions import MISSIONS


def format_roster(roster: Roster) -> str:
    profile = MISSIONS[roster.mission]
    entries = roster.entries

    if not entries:
        return "Empty roster — no units selected."

    # Compute column widths
    name_w = max(len(e.unit.full_name) for e in entries)
    name_w = max(name_w, len("Unit Name"))

    variant_w = max(len(e.unit.variant) for e in entries)
    variant_w = max(variant_w, len("Variant"))

    role_w = max(len(e.unit.role or "-") for e in entries)
    role_w = max(role_w, len("Role"))

    has_pilot_diff = any(e.gunnery != 4 or e.piloting != 5 for e in entries)

    # Header
    lines: list[str] = []
    lines.append(f" BATTLETECH ROSTER — {profile.name}")

    era_label = roster.era.value.replace("_", " ").title()
    header_parts = [f"Era: {era_label}"]
    if roster.faction_type:
        header_parts.append(f"Faction: {roster.faction_type.value.replace('_', ' ').title()}")
    if roster.faction_slug:
        header_parts.append(f"({roster.faction_slug})")
    lines.append(" " + " | ".join(header_parts))

    bv_used = roster.bv_used
    pct = bv_used / roster.bv_budget * 100 if roster.bv_budget > 0 else 0
    lines.append(
        f" BV Budget: {roster.bv_budget} | "
        f"BV Used: {bv_used} ({pct:.1f}%) | "
        f"Remaining: {roster.bv_remaining}"
    )

    # Table
    # Columns: #, Unit Name, Variant, Tons, Pilot, BV, Adj BV, Role
    num_w = len(str(len(entries)))
    num_w = max(num_w, 1)
    tons_w = 4
    pilot_w = 5
    bv_w = max(len(str(max(e.base_bv for e in entries))), 4)
    adj_bv_w = max(len(str(max(e.adjusted_bv for e in entries))), 6)

    def row(num: str, name: str, variant: str, tons: str, pilot: str, bv: str, adj_bv: str, role: str) -> str:
        return (
            f" {num:>{num_w}}  "
            f"{name:<{name_w}}  "
            f"{variant:<{variant_w}}  "
            f"{tons:>{tons_w}}  "
            f"{pilot:>{pilot_w}}  "
            f"{bv:>{bv_w}}  "
            f"{adj_bv:>{adj_bv_w}}  "
            f"{role:<{role_w}}"
        )

    header_row = row("#", "Unit Name", "Variant", "Tons", "Pilot", "BV", "Adj BV", "Role")
    separator = " " + "─" * (len(header_row) - 1)

    lines.append(separator)
    lines.append(header_row)
    lines.append(separator)

    for i, entry in enumerate(entries, 1):
        lines.append(row(
            str(i),
            entry.unit.full_name,
            entry.unit.variant,
            str(int(entry.unit.tonnage)),
            entry.pilot_str,
            str(entry.base_bv),
            str(entry.adjusted_bv),
            entry.unit.role or "-",
        ))

    lines.append(separator)

    # Totals row
    total_tons = str(int(roster.total_tonnage))
    total_base = str(roster.total_base_bv)
    total_adj = str(roster.bv_used)
    lines.append(row("", "TOTAL", "", total_tons, "", total_base, total_adj, ""))

    return "\n".join(lines)


def print_roster(roster: Roster) -> None:
    print(format_roster(roster))


def format_missions_list() -> str:
    lines = [" Available Missions:", " " + "─" * 60]
    for mission, profile in MISSIONS.items():
        lines.append(f"  {mission.value:<20} {profile.description}")
    return "\n".join(lines)


def format_eras_list(eras: list[dict]) -> str:
    lines = [" Available Eras:", " " + "─" * 60]
    for era in eras:
        lines.append(f"  {era['slug']:<30} {era['name']}")
    return "\n".join(lines)


def format_factions_list(factions: list[dict]) -> str:
    lines = [" Available Factions:", " " + "─" * 60]
    for f in factions:
        ft = f.get("factionType", "")
        clan = " (Clan)" if f.get("isClan") else ""
        lines.append(f"  {f['slug']:<30} {f['name']:<30} {ft}{clan}")
    return "\n".join(lines)
