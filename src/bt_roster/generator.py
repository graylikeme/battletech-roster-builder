"""Roster generation — mission-driven slot filling algorithm."""

from __future__ import annotations

import random

from bt_roster.models import (
    BudgetError,
    Era,
    FactionType,
    InsufficientUnitsError,
    Mission,
    Roster,
    RosterEntry,
    Unit,
    WeightClass,
)
from bt_roster.missions import Slot, assign_slots
from bt_roster.pilots import adjusted_bv as compute_adjusted_bv, baseline_for_tech_base


def generate_roster(
    units: list[Unit],
    count: int,
    bv_budget: int,
    mission: Mission,
    era: Era,
    gunnery: int = 4,
    piloting: int = 5,
    auto_pilots: bool = False,
    faction_type: FactionType | None = None,
    faction_slug: str | None = None,
    seed: int | None = None,
) -> Roster:
    if len(units) < count:
        raise InsufficientUnitsError(available=len(units), requested=count)

    if not units:
        raise BudgetError("No units available matching your filters.")

    rng = random.Random(seed)

    # When using non-default pilot skills, the effective BV changes.
    # We work in "adjusted BV" space for slot filling.
    if auto_pilots:
        # Each unit's BV depends on its tech base baseline (IS=4/5, Clan=3/4)
        def multiplier_bv(base_bv: int, tech_base: str = "") -> int:
            g, p = baseline_for_tech_base(tech_base)
            return compute_adjusted_bv(base_bv, g, p)
        unit_bv = lambda u: multiplier_bv(u.bv, u.tech_base)
    else:
        def multiplier_bv(base_bv: int, tech_base: str = "") -> int:
            return compute_adjusted_bv(base_bv, gunnery, piloting)
        unit_bv = lambda u: multiplier_bv(u.bv)

    # Check feasibility
    bvs = sorted(unit_bv(u) for u in units)
    min_possible = sum(bvs[:count])
    max_possible = sum(bvs[-count:])

    if bv_budget < min_possible:
        raise BudgetError(
            f"BV budget {bv_budget} is too low for {count} units. "
            f"Minimum feasible: {min_possible}.",
            min_bv=min_possible,
            max_bv=max_possible,
        )
    if bv_budget > max_possible:
        raise BudgetError(
            f"BV budget {bv_budget} is too high for {count} units. "
            f"Maximum feasible: {max_possible}.",
            min_bv=min_possible,
            max_bv=max_possible,
        )

    from bt_roster.missions import MISSIONS
    profile = MISSIONS[mission]
    allowed_wcs = set(profile.weight_distribution.keys())
    mission_role_values = {r.value for r in profile.role_weights.keys()}

    # Find the minimum BV among units that fit allowed weight classes
    allowed_units_bvs = sorted(
        unit_bv(u) for u in units
        if any(wc.contains(u.tonnage) for wc in allowed_wcs)
    )
    min_allowed_bv = allowed_units_bvs[0] if allowed_units_bvs else bvs[0]

    slots = assign_slots(mission, count, bv_budget)
    pool = list(units)
    selected: list[RosterEntry] = []

    for slot_idx, slot in enumerate(slots):
        remaining_budget = bv_budget - sum(e.adjusted_bv for e in selected)
        remaining_slots = count - len(selected)
        # Recalculate per-slot target based on remaining budget
        if remaining_slots > 1:
            slot_target = slot.bv_target
            # Reserve enough for remaining slots to fit allowed-weight units
            min_reserve = (remaining_slots - 1) * min_allowed_bv
            slot_target = min(slot_target, remaining_budget - min_reserve)
        else:
            slot_target = remaining_budget

        # Hard ceiling: reserve minimum BV for unfilled slots
        slots_after_this = remaining_slots - 1
        bv_ceiling = remaining_budget - (slots_after_this * min_allowed_bv)
        bv_ceiling = max(bv_ceiling, 0)

        entry = _fill_slot(pool, slot, slot_target, bv_ceiling, gunnery, piloting, auto_pilots, rng, allowed_wcs, mission_role_values)
        if entry is not None:
            selected.append(entry)
            pool.remove(entry.unit)

    # If we didn't fill all slots (unlikely with fallbacks), fill remaining
    while len(selected) < count and pool:
        remaining_budget = bv_budget - sum(e.adjusted_bv for e in selected)
        remaining_slots = count - len(selected)
        target = remaining_budget // remaining_slots if remaining_slots > 0 else remaining_budget

        # Pick any unit that fits
        candidates = [
            u for u in pool
            if unit_bv(u) <= remaining_budget
        ]
        if not candidates:
            break
        # Pick closest to target
        candidates.sort(key=lambda u: abs(unit_bv(u) - target))
        pick = candidates[0] if len(candidates) <= 3 else rng.choice(candidates[:5])
        if auto_pilots:
            g, p = baseline_for_tech_base(pick.tech_base)
            selected.append(RosterEntry(unit=pick, gunnery=g, piloting=p))
        else:
            selected.append(RosterEntry(unit=pick, gunnery=gunnery, piloting=piloting))
        pool.remove(pick)

    # Auto-assign pilot skills if requested
    if auto_pilots:
        from bt_roster.pilots import assign_pilots_auto
        assign_pilots_auto(selected, bv_budget)

    return Roster(
        entries=selected,
        mission=mission,
        era=era,
        bv_budget=bv_budget,
        faction_type=faction_type,
        faction_slug=faction_slug,
    )


def _fill_slot(
    pool: list[Unit],
    slot: Slot,
    bv_target: int,
    bv_ceiling: int,
    gunnery: int,
    piloting: int,
    auto_pilots: bool,
    rng: random.Random,
    allowed_weight_classes: set[WeightClass] | None = None,
    mission_roles: set[str] | None = None,
) -> RosterEntry | None:
    """Try to fill a slot, relaxing constraints progressively.

    bv_ceiling is the hard maximum — never pick a unit above this.
    allowed_weight_classes restricts which weight classes relaxation can use.
    mission_roles is the set of role values used by the mission profile —
    when relaxing role, prefer these over roles outside the mission.
    """
    def _unit_bv(u: Unit) -> int:
        if auto_pilots:
            g, p = baseline_for_tech_base(u.tech_base)
            return compute_adjusted_bv(u.bv, g, p)
        return compute_adjusted_bv(u.bv, gunnery, piloting)

    def _make_entry(u: Unit) -> RosterEntry:
        if auto_pilots:
            g, p = baseline_for_tech_base(u.tech_base)
            return RosterEntry(unit=u, gunnery=g, piloting=p)
        return RosterEntry(unit=u, gunnery=gunnery, piloting=piloting)

    # Try with increasing tolerance levels
    for tolerance in (0.25, 0.40, 0.60, 1.0):
        bv_low = int(bv_target * (1 - tolerance))
        bv_high = min(int(bv_target * (1 + tolerance)), bv_ceiling)

        # Pass 1: exact role + exact weight class
        candidates = [
            u for u in pool
            if u.role == slot.role.value
            and slot.weight_class.contains(u.tonnage)
            and bv_low <= _unit_bv(u) <= bv_high
        ]
        if candidates:
            pick = rng.choice(candidates)
            return _make_entry(pick)

        # Pass 2: mission-relevant role + exact weight class
        if mission_roles:
            candidates = [
                u for u in pool
                if u.role in mission_roles
                and slot.weight_class.contains(u.tonnage)
                and bv_low <= _unit_bv(u) <= bv_high
            ]
            if candidates:
                pick = rng.choice(candidates)
                return _make_entry(pick)

        # Pass 3: any role + exact weight class
        candidates = [
            u for u in pool
            if slot.weight_class.contains(u.tonnage)
            and bv_low <= _unit_bv(u) <= bv_high
        ]
        if candidates:
            pick = rng.choice(candidates)
            return _make_entry(pick)

        # Pass 4: exact role + adjacent weight class (only allowed classes)
        adjacent_wcs = _adjacent_weight_classes(slot.weight_class)
        if allowed_weight_classes:
            adjacent_wcs = [wc for wc in adjacent_wcs if wc in allowed_weight_classes]
        candidates = [
            u for u in pool
            if u.role == slot.role.value
            and any(wc.contains(u.tonnage) for wc in adjacent_wcs)
            and bv_low <= _unit_bv(u) <= bv_high
        ]
        if candidates:
            pick = rng.choice(candidates)
            return _make_entry(pick)

        # Pass 5: mission-relevant role + adjacent weight class
        if mission_roles:
            candidates = [
                u for u in pool
                if u.role in mission_roles
                and any(wc.contains(u.tonnage) for wc in adjacent_wcs)
                and bv_low <= _unit_bv(u) <= bv_high
            ]
            if candidates:
                pick = rng.choice(candidates)
                return _make_entry(pick)

        # Pass 6: any role + adjacent weight class (only allowed classes)
        candidates = [
            u for u in pool
            if any(wc.contains(u.tonnage) for wc in adjacent_wcs)
            and bv_low <= _unit_bv(u) <= bv_high
        ]
        if candidates:
            pick = rng.choice(candidates)
            return _make_entry(pick)

    # Last resort: pick the unit closest to BV target that fits under ceiling
    # Still respect allowed weight classes
    if allowed_weight_classes:
        candidates = [
            u for u in pool
            if _unit_bv(u) <= bv_ceiling
            and any(wc.contains(u.tonnage) for wc in allowed_weight_classes)
        ]
        # If nothing fits under ceiling, try any BV but keep weight restriction
        if not candidates:
            candidates = [
                u for u in pool
                if any(wc.contains(u.tonnage) for wc in allowed_weight_classes)
            ]
    else:
        candidates = [u for u in pool if multiplier_bv(u.bv) <= bv_ceiling]
        if not candidates:
            candidates = list(pool)
    if candidates:
        candidates.sort(key=lambda u: abs(multiplier_bv(u.bv) - bv_target))
        pick = candidates[0]
        return RosterEntry(unit=pick, gunnery=gunnery, piloting=piloting)

    return None


def _adjacent_weight_classes(wc: WeightClass) -> list[WeightClass]:
    """Return the given weight class plus its neighbors."""
    order = [WeightClass.LIGHT, WeightClass.MEDIUM, WeightClass.HEAVY, WeightClass.ASSAULT]
    idx = order.index(wc)
    result = [wc]
    if idx > 0:
        result.append(order[idx - 1])
    if idx < len(order) - 1:
        result.append(order[idx + 1])
    return result
