import { allowedRulesLevels, type Unit, type UnitFilters, type FactionType } from './models.js';

let apiUrl = 'https://api.battledroids.ru/graphql';

export function setApiUrl(url: string): void { apiUrl = url; }
export function getApiUrl(): string { return apiUrl; }

const PAGE_SIZE = 100;

const UNITS_QUERY = `
query Units(
  $first: Int, $after: String,
  $eraSlug: EraFilter, $factionTypes: [FactionTypeFilter!],
  $factionSlug: String, $unitType: UnitTypeFilter,
  $techBase: TechBaseFilter,
  $bvMin: Int, $bvMax: Int
) {
  units(
    first: $first, after: $after,
    eraSlug: $eraSlug, factionTypes: $factionTypes,
    factionSlug: $factionSlug, unitType: $unitType,
    techBase: $techBase,
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
}`;

const FACTIONS_QUERY = `
query Factions($isClan: Boolean) {
  allFactions(isClan: $isClan) {
    slug name factionType isClan
  }
}`;

const ERAS_QUERY = `{ allEras { slug name } }`;

interface GraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
}

async function executeQuery(query: string, variables: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json() as GraphQLResponse;
  if (json.errors) {
    const messages = json.errors.map(e => e.message).join('; ');
    throw new Error(`GraphQL errors: ${messages}`);
  }

  return json.data!;
}

function parseUnit(node: Record<string, unknown>): Unit | null {
  if (node.bv == null) return null;
  const mechData = (node.mechData ?? {}) as Record<string, unknown>;
  return {
    slug: node.slug as string,
    fullName: node.fullName as string,
    variant: (node.variant as string) ?? '',
    tonnage: node.tonnage as number,
    bv: node.bv as number,
    role: (node.role as string) ?? null,
    techBase: (node.techBase as string) ?? '',
    rulesLevel: (node.rulesLevel as string) ?? '',
    introYear: node.introYear as number | undefined,
    walkMp: mechData.walkMp as number | undefined,
    runMp: mechData.runMp as number | undefined,
    jumpMp: mechData.jumpMp as number | undefined,
  };
}

export interface FetchProgress {
  page: number;
  fetched: number;
  total: number | string;
}

export async function fetchUnits(
  filters: UnitFilters,
  onProgress?: (p: FetchProgress) => void,
): Promise<Unit[]> {
  const variables: Record<string, unknown> = { first: PAGE_SIZE };

  if (filters.era) variables.eraSlug = filters.era;
  if (filters.factionType) variables.factionTypes = [filters.factionType];
  if (filters.factionSlug) variables.factionSlug = filters.factionSlug;
  if (filters.unitType) variables.unitType = filters.unitType;
  if (filters.techBase) variables.techBase = filters.techBase;
  if (filters.bvMin != null) variables.bvMin = filters.bvMin;
  if (filters.bvMax != null) variables.bvMax = filters.bvMax;

  const units: Unit[] = [];
  let page = 1;

  while (true) {
    const data = await executeQuery(UNITS_QUERY, variables);
    const connection = data.units as {
      pageInfo: { hasNextPage: boolean; endCursor: string; totalCount: number };
      edges: Array<{ node: Record<string, unknown> }>;
    };

    for (const edge of connection.edges) {
      const unit = parseUnit(edge.node);
      if (unit) units.push(unit);
    }

    onProgress?.({ page, fetched: units.length, total: connection.pageInfo.totalCount });

    if (!connection.pageInfo.hasNextPage) break;
    variables.after = connection.pageInfo.endCursor;
    page++;
    // Rate limit: 0.5s between pages to stay under API burst limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Filter by rules level hierarchy client-side
  if (filters.maxRulesLevel) {
    const allowed = new Set(allowedRulesLevels(filters.maxRulesLevel));
    return units.filter(u => allowed.has(u.rulesLevel.toLowerCase()));
  }

  return units;
}

// ---------------------------------------------------------------------------
// Unit detail (lazy-loaded)
// ---------------------------------------------------------------------------

const UNIT_DETAIL_QUERY = `
query UnitDetail($slug: String!) {
  unit(slug: $slug) {
    slug fullName variant tonnage bv role techBase rulesLevel introYear
    mechData {
      walkMp runMp jumpMp engineRating heatSinkCount heatSinkTypeRaw
      armorTypeRaw structureTypeRaw
      engine { name } gyro { name } cockpit { name }
    }
    locations { location armorPoints rearArmor structurePoints }
    loadout { equipmentName quantity location }
    quirks { name isPositive }
  }
}`;

export interface LoadoutEntry {
  equipmentName: string;
  quantity: number;
  location: string;
}

export interface LocationEntry {
  location: string;
  armorPoints: number | null;
  rearArmor: number | null;
  structurePoints: number | null;
}

export interface QuirkEntry {
  name: string;
  isPositive: boolean;
}

export interface MechDetail {
  slug: string;
  fullName: string;
  variant: string;
  tonnage: number;
  bv: number;
  role: string | null;
  techBase: string;
  rulesLevel: string;
  introYear?: number;
  walkMp?: number;
  runMp?: number;
  jumpMp?: number;
  engineRating?: number;
  engineName?: string;
  heatSinkCount?: number;
  heatSinkType?: string;
  armorType?: string;
  structureType?: string;
  gyroName?: string;
  cockpitName?: string;
  loadout: LoadoutEntry[];
  locations: LocationEntry[];
  quirks: QuirkEntry[];
}

const detailCache = new Map<string, MechDetail>();

export async function fetchUnitDetail(slug: string): Promise<MechDetail> {
  const cached = detailCache.get(slug);
  if (cached) return cached;

  const data = await executeQuery(UNIT_DETAIL_QUERY, { slug });
  const u = data.unit as Record<string, unknown>;
  const md = (u.mechData ?? {}) as Record<string, unknown>;
  const engine = (md.engine ?? {}) as Record<string, unknown>;
  const gyro = (md.gyro ?? {}) as Record<string, unknown>;
  const cockpit = (md.cockpit ?? {}) as Record<string, unknown>;

  const detail: MechDetail = {
    slug: u.slug as string,
    fullName: u.fullName as string,
    variant: (u.variant as string) ?? '',
    tonnage: u.tonnage as number,
    bv: u.bv as number,
    role: (u.role as string) ?? null,
    techBase: (u.techBase as string) ?? '',
    rulesLevel: (u.rulesLevel as string) ?? '',
    introYear: u.introYear as number | undefined,
    walkMp: md.walkMp as number | undefined,
    runMp: md.runMp as number | undefined,
    jumpMp: md.jumpMp as number | undefined,
    engineRating: md.engineRating as number | undefined,
    engineName: engine.name as string | undefined,
    heatSinkCount: md.heatSinkCount as number | undefined,
    heatSinkType: md.heatSinkTypeRaw as string | undefined,
    armorType: md.armorTypeRaw as string | undefined,
    structureType: md.structureTypeRaw as string | undefined,
    gyroName: gyro.name as string | undefined,
    cockpitName: cockpit.name as string | undefined,
    loadout: (u.loadout as LoadoutEntry[]) ?? [],
    locations: (u.locations as LocationEntry[]) ?? [],
    quirks: (u.quirks as QuirkEntry[]) ?? [],
  };

  detailCache.set(slug, detail);
  return detail;
}

export interface FactionInfo {
  slug: string;
  name: string;
  factionType: string;
  isClan: boolean;
}

export async function fetchFactions(factionType?: FactionType): Promise<FactionInfo[]> {
  const variables: Record<string, unknown> = {};
  if (factionType === 'CLAN') variables.isClan = true;
  else if (factionType) variables.isClan = false;

  const data = await executeQuery(FACTIONS_QUERY, variables);
  let factions = data.allFactions as FactionInfo[];

  if (factionType && factionType !== 'CLAN') {
    const ftLower = factionType.toLowerCase();
    factions = factions.filter(f => f.factionType.toLowerCase() === ftLower);
  }

  return factions.sort((a, b) => a.name.localeCompare(b.name));
}

export interface EraInfo {
  slug: string;
  name: string;
}

export async function fetchEras(): Promise<EraInfo[]> {
  const data = await executeQuery(ERAS_QUERY);
  return data.allEras as EraInfo[];
}
