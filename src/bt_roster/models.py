from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


# ---------------------------------------------------------------------------
# Enums (mirror the GraphQL API)
# ---------------------------------------------------------------------------

class Era(str, Enum):
    AGE_OF_WAR = "AGE_OF_WAR"
    STAR_LEAGUE = "STAR_LEAGUE"
    EARLY_SUCCESSION_WARS = "EARLY_SUCCESSION_WARS"
    LATE_SUCCESSION_WARS = "LATE_SUCCESSION_WARS"
    RENAISSANCE = "RENAISSANCE"
    CLAN_INVASION = "CLAN_INVASION"
    CIVIL_WAR = "CIVIL_WAR"
    JIHAD = "JIHAD"
    DARK_AGE = "DARK_AGE"
    IL_CLAN = "IL_CLAN"


class FactionType(str, Enum):
    GREAT_HOUSE = "GREAT_HOUSE"
    CLAN = "CLAN"
    PERIPHERY = "PERIPHERY"
    MERCENARY = "MERCENARY"
    OTHER = "OTHER"


class UnitType(str, Enum):
    MECH = "MECH"
    VEHICLE = "VEHICLE"
    FIGHTER = "FIGHTER"
    OTHER = "OTHER"


class TechBase(str, Enum):
    INNER_SPHERE = "INNER_SPHERE"
    CLAN = "CLAN"
    MIXED = "MIXED"
    PRIMITIVE = "PRIMITIVE"


class RulesLevel(str, Enum):
    INTRODUCTORY = "INTRODUCTORY"
    STANDARD = "STANDARD"
    ADVANCED = "ADVANCED"
    EXPERIMENTAL = "EXPERIMENTAL"
    UNOFFICIAL = "UNOFFICIAL"

    def allowed_levels(self) -> set[str]:
        """Return all rules levels up to and including this one.

        The hierarchy is: INTRODUCTORY < STANDARD < ADVANCED < EXPERIMENTAL.
        UNOFFICIAL is standalone and only includes itself + the standard hierarchy.
        """
        hierarchy = ["introductory", "standard", "advanced", "experimental"]
        if self == RulesLevel.UNOFFICIAL:
            return {"introductory", "standard", "advanced", "experimental", "unofficial"}
        idx = hierarchy.index(self.value.lower())
        return set(hierarchy[: idx + 1])


class Role(str, Enum):
    BRAWLER = "Brawler"
    JUGGERNAUT = "Juggernaut"
    MISSILE_BOAT = "Missile Boat"
    SCOUT = "Scout"
    SKIRMISHER = "Skirmisher"
    SNIPER = "Sniper"
    STRIKER = "Striker"


class WeightClass(Enum):
    LIGHT = (20, 35)
    MEDIUM = (40, 55)
    HEAVY = (60, 75)
    ASSAULT = (80, 100)

    def __init__(self, min_tons: int, max_tons: int) -> None:
        self.min_tons = min_tons
        self.max_tons = max_tons

    def contains(self, tonnage: float) -> bool:
        return self.min_tons <= tonnage <= self.max_tons

    @classmethod
    def from_tonnage(cls, tonnage: float) -> WeightClass:
        for wc in cls:
            if wc.contains(tonnage):
                return wc
        raise ValueError(f"No weight class for {tonnage}t")


class Mission(str, Enum):
    PITCHED_BATTLE = "pitched_battle"
    RECON = "recon"
    OBJECTIVE_RAID = "objective_raid"
    DEFENSE = "defense"
    ESCORT = "escort"
    EXTRACTION = "extraction"
    BREAKTHROUGH = "breakthrough"
    ZONE_CONTROL = "zone_control"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class Unit:
    slug: str
    full_name: str
    variant: str
    tonnage: float
    bv: int
    role: str | None
    tech_base: str
    rules_level: str
    intro_year: int | None = None
    walk_mp: int | None = None
    run_mp: int | None = None
    jump_mp: int | None = None

    @property
    def weight_class(self) -> WeightClass:
        return WeightClass.from_tonnage(self.tonnage)


@dataclass(slots=True)
class RosterEntry:
    unit: Unit
    gunnery: int = 4
    piloting: int = 5

    @property
    def base_bv(self) -> int:
        return self.unit.bv

    @property
    def adjusted_bv(self) -> int:
        from bt_roster.pilots import adjusted_bv
        return adjusted_bv(self.unit.bv, self.gunnery, self.piloting)

    @property
    def pilot_str(self) -> str:
        return f"{self.gunnery}/{self.piloting}"


@dataclass
class Roster:
    entries: list[RosterEntry]
    mission: Mission
    era: Era
    bv_budget: int
    faction_type: FactionType | None = None
    faction_slug: str | None = None

    @property
    def bv_used(self) -> int:
        return sum(e.adjusted_bv for e in self.entries)

    @property
    def bv_remaining(self) -> int:
        return self.bv_budget - self.bv_used

    @property
    def total_tonnage(self) -> float:
        return sum(e.unit.tonnage for e in self.entries)

    @property
    def total_base_bv(self) -> int:
        return sum(e.base_bv for e in self.entries)


@dataclass
class UnitFilters:
    era: Era | None = None
    faction_type: FactionType | None = None
    faction_slug: str | None = None
    unit_type: UnitType | None = None
    tech_base: TechBase | None = None
    max_rules_level: RulesLevel | None = None
    bv_min: int | None = None
    bv_max: int | None = None


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class BtRosterError(Exception):
    pass


class ApiError(BtRosterError):
    pass


class GraphQLError(BtRosterError):
    def __init__(self, errors: list[dict]) -> None:
        self.errors = errors
        messages = "; ".join(e.get("message", str(e)) for e in errors)
        super().__init__(f"GraphQL errors: {messages}")


class InsufficientUnitsError(BtRosterError):
    def __init__(self, available: int, requested: int) -> None:
        self.available = available
        self.requested = requested
        super().__init__(
            f"Only {available} units available, but {requested} requested."
        )


class BudgetError(BtRosterError):
    def __init__(self, message: str, min_bv: int | None = None, max_bv: int | None = None) -> None:
        self.min_bv = min_bv
        self.max_bv = max_bv
        super().__init__(message)
