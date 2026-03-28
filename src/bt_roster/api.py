"""GraphQL client for the BattleDroids BattleTech API."""

from __future__ import annotations

import json
import sys
import time
import urllib.request
import urllib.error

from bt_roster.models import (
    ApiError,
    Era,
    FactionType,
    GraphQLError,
    TechBase,
    RulesLevel,
    Unit,
    UnitFilters,
    UnitType,
)

API_URL = "https://api.battledroids.ru/graphql"
PAGE_SIZE = 100
PAGE_DELAY = 0.5  # seconds between paginated requests

_UNITS_QUERY = """\
query Units(
  $first: Int, $after: String,
  $eraSlug: EraFilter, $factionTypes: [FactionTypeFilter!],
  $factionSlug: String, $unitType: UnitTypeFilter,
  $techBase: TechBaseFilter, $rulesLevel: RulesLevelFilter,
  $bvMin: Int, $bvMax: Int
) {
  units(
    first: $first, after: $after,
    eraSlug: $eraSlug, factionTypes: $factionTypes,
    factionSlug: $factionSlug, unitType: $unitType,
    techBase: $techBase, rulesLevel: $rulesLevel,
    bvMin: $bvMin, bvMax: $bvMax
  ) {
    pageInfo { hasNextPage endCursor totalCount }
    edges {
      node {
        slug fullName variant techBase rulesLevel
        tonnage bv role introYear
        mechData { walkMp runMp jumpMp }
      }
    }
  }
}"""

_FACTIONS_QUERY = """\
query Factions($isClan: Boolean) {
  allFactions(isClan: $isClan) {
    slug name factionType isClan
  }
}"""

_ERAS_QUERY = """\
{
  allEras {
    slug name
  }
}"""


def _execute_query(query: str, variables: dict | None = None) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except urllib.error.URLError as exc:
        raise ApiError(f"Cannot reach API: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ApiError(f"Invalid JSON response: {exc}") from exc

    if "errors" in data:
        raise GraphQLError(data["errors"])
    return data["data"]


def _build_variables(filters: UnitFilters) -> dict:
    variables: dict = {"first": PAGE_SIZE}
    if filters.era:
        variables["eraSlug"] = filters.era.value
    if filters.faction_type:
        variables["factionTypes"] = [filters.faction_type.value]
    if filters.faction_slug:
        variables["factionSlug"] = filters.faction_slug
    if filters.unit_type:
        variables["unitType"] = filters.unit_type.value
    if filters.tech_base:
        variables["techBase"] = filters.tech_base.value
    # rules_level is filtered client-side (hierarchy logic)
    if filters.bv_min is not None:
        variables["bvMin"] = filters.bv_min
    if filters.bv_max is not None:
        variables["bvMax"] = filters.bv_max
    return variables


def _parse_unit(node: dict) -> Unit | None:
    bv = node.get("bv")
    if bv is None:
        return None
    mech_data = node.get("mechData") or {}
    return Unit(
        slug=node["slug"],
        full_name=node["fullName"],
        variant=node.get("variant") or "",
        tonnage=node["tonnage"],
        bv=bv,
        role=node.get("role"),
        tech_base=node.get("techBase", ""),
        rules_level=node.get("rulesLevel", ""),
        intro_year=node.get("introYear"),
        walk_mp=mech_data.get("walkMp"),
        run_mp=mech_data.get("runMp"),
        jump_mp=mech_data.get("jumpMp"),
    )


def fetch_units(filters: UnitFilters) -> list[Unit]:
    """Fetch all units matching filters, handling pagination."""
    variables = _build_variables(filters)
    units: list[Unit] = []
    page = 1

    while True:
        data = _execute_query(_UNITS_QUERY, variables)
        connection = data["units"]
        page_info = connection["pageInfo"]
        total = page_info.get("totalCount", "?")

        for edge in connection["edges"]:
            unit = _parse_unit(edge["node"])
            if unit is not None:
                units.append(unit)

        print(
            f"\rFetching units... page {page} ({len(units)}/{total})",
            end="",
            file=sys.stderr,
            flush=True,
        )

        if not page_info["hasNextPage"]:
            break

        variables["after"] = page_info["endCursor"]
        page += 1
        time.sleep(PAGE_DELAY)

    # Filter by rules level hierarchy client-side
    if filters.max_rules_level:
        allowed = filters.max_rules_level.allowed_levels()
        before = len(units)
        units = [u for u in units if u.rules_level.lower() in allowed]
        filtered_out = before - len(units)
        if filtered_out:
            print(
                f"\rFetched {before} units, {filtered_out} excluded by rules level "
                f"(max: {filters.max_rules_level.value}).{' ' * 10}",
                file=sys.stderr,
            )
        else:
            print(f"\rFetched {len(units)} units.{' ' * 20}", file=sys.stderr)
    else:
        print(f"\rFetched {len(units)} units.{' ' * 20}", file=sys.stderr)
    return units


def fetch_factions(
    faction_type: FactionType | None = None,
) -> list[dict]:
    variables: dict = {}
    if faction_type == FactionType.CLAN:
        variables["isClan"] = True
    elif faction_type is not None:
        variables["isClan"] = False

    data = _execute_query(_FACTIONS_QUERY, variables)
    factions = data["allFactions"]

    # Filter by exact faction type if needed (isClan is coarse)
    # API returns lowercase factionType values
    if faction_type and faction_type != FactionType.CLAN:
        ft_lower = faction_type.value.lower()
        factions = [f for f in factions if f.get("factionType", "").lower() == ft_lower]

    return sorted(factions, key=lambda f: f["name"])


def fetch_eras() -> list[dict]:
    data = _execute_query(_ERAS_QUERY)
    return data["allEras"]
