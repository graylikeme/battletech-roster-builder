"""Mission profiles — role and weight class distributions per scenario type."""

from __future__ import annotations

from dataclasses import dataclass

from bt_roster.models import Mission, Role, WeightClass


@dataclass(frozen=True, slots=True)
class MissionProfile:
    name: str
    description: str
    role_weights: dict[Role, float]
    weight_distribution: dict[WeightClass, float]


MISSIONS: dict[Mission, MissionProfile] = {
    Mission.PITCHED_BATTLE: MissionProfile(
        name="Pitched Battle",
        description="Standard direct engagement — destroy or rout the enemy.",
        role_weights={
            Role.JUGGERNAUT: 0.25,
            Role.BRAWLER: 0.25,
            Role.SNIPER: 0.20,
            Role.MISSILE_BOAT: 0.15,
            Role.SKIRMISHER: 0.15,
        },
        weight_distribution={
            WeightClass.ASSAULT: 0.20,
            WeightClass.HEAVY: 0.40,
            WeightClass.MEDIUM: 0.40,
        },
    ),
    Mission.RECON: MissionProfile(
        name="Recon",
        description="Locate hidden objectives, search buildings, gather intel.",
        role_weights={
            Role.SKIRMISHER: 0.40,
            Role.STRIKER: 0.40,
            Role.SNIPER: 0.20,
        },
        weight_distribution={
            WeightClass.LIGHT: 0.40,
            WeightClass.MEDIUM: 0.40,
            WeightClass.HEAVY: 0.20,
        },
    ),
    Mission.OBJECTIVE_RAID: MissionProfile(
        name="Objective Raid",
        description="Destroy installations, turrets, buildings, infrastructure.",
        role_weights={
            Role.SNIPER: 0.30,
            Role.MISSILE_BOAT: 0.25,
            Role.STRIKER: 0.25,
            Role.BRAWLER: 0.20,
        },
        weight_distribution={
            WeightClass.MEDIUM: 0.35,
            WeightClass.HEAVY: 0.35,
            WeightClass.LIGHT: 0.15,
            WeightClass.ASSAULT: 0.15,
        },
    ),
    Mission.DEFENSE: MissionProfile(
        name="Defense",
        description="Hold a position, protect buildings or installations.",
        role_weights={
            Role.JUGGERNAUT: 0.30,
            Role.SNIPER: 0.25,
            Role.MISSILE_BOAT: 0.25,
            Role.BRAWLER: 0.20,
        },
        weight_distribution={
            WeightClass.ASSAULT: 0.35,
            WeightClass.HEAVY: 0.40,
            WeightClass.MEDIUM: 0.25,
        },
    ),
    Mission.ESCORT: MissionProfile(
        name="Escort",
        description="Protect a convoy or VIP mech moving across the map.",
        role_weights={
            Role.SKIRMISHER: 0.30,
            Role.BRAWLER: 0.25,
            Role.STRIKER: 0.25,
            Role.JUGGERNAUT: 0.20,
        },
        weight_distribution={
            WeightClass.HEAVY: 0.30,
            WeightClass.MEDIUM: 0.35,
            WeightClass.LIGHT: 0.20,
            WeightClass.ASSAULT: 0.15,
        },
    ),
    Mission.EXTRACTION: MissionProfile(
        name="Extraction",
        description="Retrieve an objective/unit and bring it back to your edge.",
        role_weights={
            Role.STRIKER: 0.35,
            Role.SKIRMISHER: 0.30,
            Role.BRAWLER: 0.20,
            Role.SNIPER: 0.15,
        },
        weight_distribution={
            WeightClass.MEDIUM: 0.40,
            WeightClass.LIGHT: 0.30,
            WeightClass.HEAVY: 0.25,
            WeightClass.ASSAULT: 0.05,
        },
    ),
    Mission.BREAKTHROUGH: MissionProfile(
        name="Breakthrough",
        description="Escape through enemy lines with as many units as possible.",
        role_weights={
            Role.BRAWLER: 0.30,
            Role.SKIRMISHER: 0.30,
            Role.JUGGERNAUT: 0.25,
            Role.STRIKER: 0.15,
        },
        weight_distribution={
            WeightClass.HEAVY: 0.40,
            WeightClass.MEDIUM: 0.40,
            WeightClass.ASSAULT: 0.20,
        },
    ),
    Mission.ZONE_CONTROL: MissionProfile(
        name="Zone Control",
        description="Hold multiple objective points spread across the map.",
        role_weights={
            Role.JUGGERNAUT: 0.25,
            Role.SKIRMISHER: 0.25,
            Role.SNIPER: 0.25,
            Role.BRAWLER: 0.25,
        },
        weight_distribution={
            WeightClass.HEAVY: 0.35,
            WeightClass.MEDIUM: 0.40,
            WeightClass.ASSAULT: 0.25,
        },
    ),
}

# Role → preferred weight classes (heavier roles get heavier mechs)
_ROLE_WEIGHT_AFFINITY: dict[Role, list[WeightClass]] = {
    Role.JUGGERNAUT: [WeightClass.ASSAULT, WeightClass.HEAVY],
    Role.BRAWLER: [WeightClass.HEAVY, WeightClass.MEDIUM, WeightClass.ASSAULT],
    Role.SNIPER: [WeightClass.HEAVY, WeightClass.MEDIUM],
    Role.MISSILE_BOAT: [WeightClass.HEAVY, WeightClass.MEDIUM, WeightClass.ASSAULT],
    Role.SKIRMISHER: [WeightClass.MEDIUM, WeightClass.HEAVY, WeightClass.LIGHT],
    Role.STRIKER: [WeightClass.MEDIUM, WeightClass.LIGHT],
    Role.SCOUT: [WeightClass.LIGHT, WeightClass.MEDIUM],
}

# BV budget weight per weight class (relative to average)
_WEIGHT_CLASS_BV_FACTOR: dict[WeightClass, float] = {
    WeightClass.ASSAULT: 1.35,
    WeightClass.HEAVY: 1.15,
    WeightClass.MEDIUM: 1.00,
    WeightClass.LIGHT: 0.70,
}


@dataclass(frozen=True, slots=True)
class Slot:
    role: Role
    weight_class: WeightClass
    bv_target: int


def assign_slots(mission: Mission, count: int, bv_budget: int) -> list[Slot]:
    """Create roster slots with role, weight class, and BV targets."""
    profile = MISSIONS[mission]

    # --- Step 1: Distribute roles across slots ---
    # Sort roles by weight (descending) so highest-priority roles get slots first
    sorted_roles = sorted(
        profile.role_weights.items(), key=lambda x: x[1], reverse=True
    )

    role_slots: list[Role] = []
    remaining = count
    for i, (role, weight) in enumerate(sorted_roles):
        if i == len(sorted_roles) - 1:
            # Last role gets whatever is left
            n = remaining
        else:
            n = round(count * weight)
            n = min(n, remaining)
        role_slots.extend([role] * n)
        remaining -= n
        if remaining <= 0:
            break

    # --- Step 2: Assign weight class per slot ---
    # Count how many slots we want per weight class
    wc_counts: dict[WeightClass, int] = {}
    wc_remaining = count
    sorted_wcs = sorted(
        profile.weight_distribution.items(), key=lambda x: x[1], reverse=True
    )
    for i, (wc, pct) in enumerate(sorted_wcs):
        if i == len(sorted_wcs) - 1:
            n = wc_remaining
        else:
            n = round(count * pct)
            n = min(n, wc_remaining)
        wc_counts[wc] = n
        wc_remaining -= n
        if wc_remaining <= 0:
            break

    # Build a pool of weight classes to assign
    wc_pool: list[WeightClass] = []
    for wc in (WeightClass.ASSAULT, WeightClass.HEAVY, WeightClass.MEDIUM, WeightClass.LIGHT):
        wc_pool.extend([wc] * wc_counts.get(wc, 0))

    # Match roles to weight classes based on affinity
    assigned_wcs: list[WeightClass] = [WeightClass.MEDIUM] * count
    used_wc_indices: set[int] = set()

    for slot_idx, role in enumerate(role_slots):
        preferred = _ROLE_WEIGHT_AFFINITY.get(role, list(WeightClass))
        best_wc_idx: int | None = None
        best_priority = 999
        for wc_idx, wc in enumerate(wc_pool):
            if wc_idx in used_wc_indices:
                continue
            if wc in preferred:
                priority = preferred.index(wc)
                if priority < best_priority:
                    best_priority = priority
                    best_wc_idx = wc_idx
        if best_wc_idx is None:
            # No preferred match left — take any remaining
            for wc_idx in range(len(wc_pool)):
                if wc_idx not in used_wc_indices:
                    best_wc_idx = wc_idx
                    break
        if best_wc_idx is not None:
            assigned_wcs[slot_idx] = wc_pool[best_wc_idx]
            used_wc_indices.add(best_wc_idx)

    # --- Step 3: Assign BV budget per slot ---
    factors = [_WEIGHT_CLASS_BV_FACTOR[wc] for wc in assigned_wcs]
    total_factor = sum(factors)
    bv_targets = [round(bv_budget * f / total_factor) for f in factors]

    # Adjust rounding so sum == bv_budget
    diff = bv_budget - sum(bv_targets)
    if diff != 0:
        # Add/subtract from the largest slot
        largest_idx = bv_targets.index(max(bv_targets))
        bv_targets[largest_idx] += diff

    # Build slots, sorted heaviest first
    slots = [
        Slot(role=role_slots[i], weight_class=assigned_wcs[i], bv_target=bv_targets[i])
        for i in range(count)
    ]
    # Sort: Assault first, then Heavy, Medium, Light
    weight_order = {WeightClass.ASSAULT: 0, WeightClass.HEAVY: 1, WeightClass.MEDIUM: 2, WeightClass.LIGHT: 3}
    slots.sort(key=lambda s: weight_order[s.weight_class])

    return slots
