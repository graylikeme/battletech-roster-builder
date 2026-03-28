import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUnits, fetchEras, fetchFactions } from '../src/api.js';
import type { UnitFilters, Unit } from '../src/models.js';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function graphqlResponse(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeUnitNode(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'atlas-as7-d',
    fullName: 'Atlas AS7-D',
    variant: 'AS7-D',
    techBase: 'inner_sphere',
    rulesLevel: 'standard',
    tonnage: 100,
    bv: 1897,
    role: 'Juggernaut',
    introYear: 2755,
    mechData: { walkMp: 3, runMp: 5, jumpMp: 0 },
    ...overrides,
  };
}

function unitsPage(nodes: Record<string, unknown>[], hasNextPage = false, endCursor = 'abc', totalCount = nodes.length) {
  return {
    units: {
      pageInfo: { hasNextPage, endCursor, totalCount },
      edges: nodes.map(n => ({ node: n })),
    },
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchUnits', () => {
  it('returns parsed units from a single page', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse(
      unitsPage([makeUnitNode(), makeUnitNode({ slug: 'hunchback-hbk-4g', fullName: 'Hunchback HBK-4G', tonnage: 50, bv: 1067, role: 'Juggernaut' })])
    ));

    const units = await fetchUnits({});
    expect(units).toHaveLength(2);
    expect(units[0].slug).toBe('atlas-as7-d');
    expect(units[0].bv).toBe(1897);
    expect(units[0].tonnage).toBe(100);
    expect(units[0].walkMp).toBe(3);
  });

  it('handles pagination across multiple pages', async () => {
    mockFetch
      .mockResolvedValueOnce(graphqlResponse(
        unitsPage([makeUnitNode()], true, 'cursor1', 2)
      ))
      .mockResolvedValueOnce(graphqlResponse(
        unitsPage([makeUnitNode({ slug: 'page2-mech' })], false, 'cursor2', 2)
      ));

    const units = await fetchUnits({});
    expect(units).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('filters out units with null BV', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse(
      unitsPage([makeUnitNode(), makeUnitNode({ slug: 'null-bv', bv: null })])
    ));

    const units = await fetchUnits({});
    expect(units).toHaveLength(1);
    expect(units[0].slug).toBe('atlas-as7-d');
  });

  it('sends rulesLevel to API when maxRulesLevel is set', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse(
      unitsPage([makeUnitNode({ rulesLevel: 'standard' })])
    ));

    await fetchUnits({ maxRulesLevel: 'STANDARD' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.variables.rulesLevel).toBe('STANDARD');
  });

  it('does not send rulesLevel when maxRulesLevel is not set', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse(
      unitsPage([makeUnitNode()])
    ));

    await fetchUnits({});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.variables.rulesLevel).toBeUndefined();
  });
});

describe('fetchEras', () => {
  it('returns era list', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse({
      allEras: [
        { slug: 'clan-invasion', name: 'Clan Invasion' },
        { slug: 'dark-age', name: 'Dark Age' },
      ],
    }));

    const eras = await fetchEras();
    expect(eras).toHaveLength(2);
    expect(eras[0].slug).toBe('clan-invasion');
  });
});

describe('fetchFactions', () => {
  it('returns faction list', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse({
      allFactions: [
        { slug: 'davion', name: 'Federated Suns', factionType: 'great_house', isClan: false },
        { slug: 'clan-wolf', name: 'Clan Wolf', factionType: 'clan', isClan: true },
      ],
    }));

    const factions = await fetchFactions();
    expect(factions).toHaveLength(2);
  });

  it('filters by faction type', async () => {
    mockFetch.mockResolvedValueOnce(graphqlResponse({
      allFactions: [
        { slug: 'davion', name: 'Federated Suns', factionType: 'great_house', isClan: false },
        { slug: 'clan-wolf', name: 'Clan Wolf', factionType: 'clan', isClan: true },
      ],
    }));

    const factions = await fetchFactions('GREAT_HOUSE');
    expect(factions).toHaveLength(1);
    expect(factions[0].slug).toBe('davion');
  });
});
