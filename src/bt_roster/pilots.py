"""BV skill multiplier table (TechManual p.315) and pilot assignment logic."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from bt_roster.models import RosterEntry, Role

# Rows = Gunnery (0-8), Columns = Piloting (0-8)
# Source: BattleTech TechManual 2022, p.315
BV_SKILL_MULTIPLIER: list[list[float]] = [
    # P:  0     1     2     3     4     5     6     7     8
    [2.42, 2.31, 2.21, 2.10, 1.93, 1.75, 1.68, 1.59, 1.50],  # G0
    [2.21, 2.11, 2.02, 1.92, 1.76, 1.60, 1.54, 1.46, 1.38],  # G1
    [1.93, 1.85, 1.76, 1.68, 1.54, 1.40, 1.35, 1.28, 1.21],  # G2
    [1.66, 1.58, 1.51, 1.44, 1.32, 1.20, 1.16, 1.10, 1.04],  # G3
    [1.38, 1.32, 1.26, 1.20, 1.10, 1.00, 0.95, 0.90, 0.85],  # G4
    [1.31, 1.19, 1.13, 1.08, 0.99, 0.90, 0.86, 0.81, 0.77],  # G5
    [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72],  # G6
    [1.17, 1.06, 1.01, 0.96, 0.88, 0.80, 0.76, 0.72, 0.68],  # G7
    [1.10, 0.99, 0.95, 0.90, 0.83, 0.75, 0.71, 0.68, 0.64],  # G8
]


def get_multiplier(gunnery: int, piloting: int) -> float:
    g = max(0, min(8, gunnery))
    p = max(0, min(8, piloting))
    return BV_SKILL_MULTIPLIER[g][p]


def adjusted_bv(base_bv: int, gunnery: int, piloting: int) -> int:
    return round(base_bv * get_multiplier(gunnery, piloting))


# Floor for auto-assigned skills — 2 is veteran, anything below is legendary/unrealistic
MIN_SKILL = 2

# Default pilot skills by tech base (TechManual / Campaign Operations)
# IS Regular = 4/5, Clan Frontline = 3/4
BASELINE_SKILLS: dict[str, tuple[int, int]] = {
    "inner_sphere": (4, 5),  # Regular
    "clan": (3, 4),          # Veteran (Clan frontline standard)
    "mixed": (4, 5),         # Treat as IS
    "primitive": (4, 5),     # Treat as IS
}

DEFAULT_SKILL = (4, 5)


def baseline_for_tech_base(tech_base: str | None) -> tuple[int, int]:
    """Return (gunnery, piloting) baseline for a given tech base."""
    if tech_base is None:
        return DEFAULT_SKILL
    return BASELINE_SKILLS.get(tech_base.lower(), DEFAULT_SKILL)


# Roles where gunnery improvement matters more
_GUNNERY_PRIORITY_ROLES = {"Sniper", "Missile Boat", "Juggernaut"}
# Roles where piloting improvement matters more
_PILOTING_PRIORITY_ROLES = {"Striker", "Skirmisher", "Brawler", "Scout"}


def assign_pilots_auto(
    entries: list[RosterEntry],
    bv_budget: int,
) -> None:
    """Assign baseline pilot skills per unit tech base, then greedily upgrade.

    Modifies entries in-place. Sets IS units to 4/5, Clan units to 3/4,
    then spends remaining BV on upgrades prioritising gunnery on fire-support
    roles and piloting on mobile/melee roles.
    """
    # Set baseline skills per unit's tech base
    for entry in entries:
        g, p = baseline_for_tech_base(entry.unit.tech_base)
        entry.gunnery = g
        entry.piloting = p
    while True:
        current_total = sum(e.adjusted_bv for e in entries)
        remaining = bv_budget - current_total
        if remaining <= 0:
            break

        best_entry: RosterEntry | None = None
        best_cost = math.inf
        best_skill: str = ""  # "gunnery" or "piloting"
        best_priority: float = 0.0

        for entry in entries:
            role = entry.unit.role or ""
            for skill in ("gunnery", "piloting"):
                if skill == "gunnery":
                    new_g, new_p = entry.gunnery - 1, entry.piloting
                    if new_g < MIN_SKILL:
                        continue
                    priority = 1.2 if role in _GUNNERY_PRIORITY_ROLES else 0.8
                else:
                    new_g, new_p = entry.gunnery, entry.piloting - 1
                    if new_p < MIN_SKILL:
                        continue
                    priority = 1.2 if role in _PILOTING_PRIORITY_ROLES else 0.8

                cost = adjusted_bv(entry.unit.bv, new_g, new_p) - entry.adjusted_bv
                if cost <= 0 or cost > remaining:
                    continue

                # Lower cost-per-priority is better
                score = cost / priority
                if score < best_cost:
                    best_cost = score
                    best_entry = entry
                    best_skill = skill
                    best_priority = priority

        if best_entry is None:
            break

        if best_skill == "gunnery":
            best_entry.gunnery -= 1
        else:
            best_entry.piloting -= 1
