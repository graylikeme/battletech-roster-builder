import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadCollections,
  saveCollection,
  deleteCollection,
  updateCollection,
  createCollection,
  type Collection,
  type CollectionEntry,
} from '../src/services/collections'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

function makeUnitEntry(slug = 'atlas-as7-d'): CollectionEntry {
  return {
    type: 'unit',
    unitRef: {
      slug,
      fullName: 'Atlas AS7-D',
      variant: 'AS7-D',
      tonnage: 100,
      bv: 1897,
      role: 'Juggernaut',
      techBase: 'inner_sphere',
    },
  }
}

function makeSecondUnitEntry(): CollectionEntry {
  return {
    type: 'unit',
    unitRef: {
      slug: 'catapult-cplt-c1',
      fullName: 'Catapult CPLT-C1',
      variant: 'CPLT-C1',
      tonnage: 65,
      bv: 1399,
      role: 'Missile Boat',
      techBase: 'inner_sphere',
    },
  }
}

describe('createCollection', () => {
  it('creates a mech_collection with correct defaults', () => {
    const c = createCollection('My Mechs', 'mech_collection')
    expect(c.name).toBe('My Mechs')
    expect(c.collectionType).toBe('mech_collection')
    expect(c.entries).toEqual([])
    expect(c.id).toBeTruthy()
    expect(c.createdAt).toBeTruthy()
    expect(c.updatedAt).toBeTruthy()
  })

  it('creates a roster with correct defaults', () => {
    const c = createCollection('My Roster', 'roster')
    expect(c.collectionType).toBe('roster')
  })
})

describe('saveCollection + loadCollections', () => {
  it('saves and loads a collection', () => {
    const c = createCollection('Test', 'mech_collection')
    saveCollection(c)
    const loaded = loadCollections()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('Test')
  })

  it('saves multiple collections', () => {
    saveCollection(createCollection('A', 'mech_collection'))
    saveCollection(createCollection('B', 'roster'))
    expect(loadCollections()).toHaveLength(2)
  })

  it('updates existing collection if same id', () => {
    const c = createCollection('Original', 'mech_collection')
    saveCollection(c)
    c.name = 'Updated'
    saveCollection(c)
    const loaded = loadCollections()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('Updated')
  })

  it('returns empty array when no data', () => {
    expect(loadCollections()).toEqual([])
  })
})

describe('deleteCollection', () => {
  it('removes a collection by id', () => {
    const c = createCollection('Delete Me', 'mech_collection')
    saveCollection(c)
    expect(loadCollections()).toHaveLength(1)
    deleteCollection(c.id)
    expect(loadCollections()).toHaveLength(0)
  })

  it('does nothing for unknown id', () => {
    saveCollection(createCollection('Keep', 'mech_collection'))
    deleteCollection('nonexistent')
    expect(loadCollections()).toHaveLength(1)
  })
})

describe('updateCollection', () => {
  it('renames a collection', () => {
    const c = createCollection('Old Name', 'mech_collection')
    saveCollection(c)
    updateCollection(c.id, { name: 'New Name' })
    expect(loadCollections()[0].name).toBe('New Name')
  })

  it('changes collection type', () => {
    const c = createCollection('My Lance', 'mech_collection')
    saveCollection(c)
    updateCollection(c.id, { collectionType: 'roster' })
    expect(loadCollections()[0].collectionType).toBe('roster')
  })

  it('adds entries', () => {
    const c = createCollection('Pool', 'mech_collection')
    saveCollection(c)
    updateCollection(c.id, { entries: [makeUnitEntry(), makeSecondUnitEntry()] })
    const loaded = loadCollections()[0]
    expect(loaded.entries).toHaveLength(2)
    expect(loaded.entries[0].unitRef.slug).toBe('atlas-as7-d')
    expect(loaded.entries[1].unitRef.slug).toBe('catapult-cplt-c1')
  })

  it('updates updatedAt timestamp', () => {
    const c = createCollection('Timestamped', 'mech_collection')
    saveCollection(c)
    // Mock Date to advance time
    const later = new Date(Date.now() + 60_000).toISOString()
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce(later)
    updateCollection(c.id, { name: 'Changed' })
    vi.restoreAllMocks()
    const loaded = loadCollections()[0]
    expect(loaded.updatedAt).toBe(later)
  })

  it('does nothing for unknown id', () => {
    saveCollection(createCollection('Keep', 'mech_collection'))
    updateCollection('nonexistent', { name: 'Nope' })
    expect(loadCollections()[0].name).toBe('Keep')
  })
})

describe('collection entries', () => {
  it('stores unit entries with minimal data', () => {
    const c = createCollection('Units', 'mech_collection')
    c.entries = [makeUnitEntry()]
    saveCollection(c)
    const loaded = loadCollections()[0]
    const entry = loaded.entries[0]
    expect(entry.type).toBe('unit')
    expect(entry.unitRef?.slug).toBe('atlas-as7-d')
    expect(entry.unitRef?.tonnage).toBe(100)
    expect(entry.unitRef?.bv).toBe(1897)
  })

  it('chassisProxy defaults to false', () => {
    const c = createCollection('Pool', 'mech_collection')
    expect(c.chassisProxy).toBe(false)
  })

  it('chassisProxy can be toggled', () => {
    const c = createCollection('Pool', 'mech_collection')
    saveCollection(c)
    updateCollection(c.id, { chassisProxy: true })
    expect(loadCollections()[0].chassisProxy).toBe(true)
    updateCollection(c.id, { chassisProxy: false })
    expect(loadCollections()[0].chassisProxy).toBe(false)
  })

  it('stores roster entries with pilot skills', () => {
    const c = createCollection('Saved Roster', 'roster')
    c.entries = [{ ...makeUnitEntry(), gunnery: 3, piloting: 4 }]
    saveCollection(c)
    const loaded = loadCollections()[0]
    expect(loaded.entries[0].gunnery).toBe(3)
    expect(loaded.entries[0].piloting).toBe(4)
  })
})

describe('filtering by type', () => {
  it('can filter mech_collection vs roster', () => {
    saveCollection(createCollection('Pool A', 'mech_collection'))
    saveCollection(createCollection('Pool B', 'mech_collection'))
    saveCollection(createCollection('Roster A', 'roster'))
    const all = loadCollections()
    expect(all).toHaveLength(3)
    const mechCollections = all.filter(c => c.collectionType === 'mech_collection')
    const rosters = all.filter(c => c.collectionType === 'roster')
    expect(mechCollections).toHaveLength(2)
    expect(rosters).toHaveLength(1)
  })
})
