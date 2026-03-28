import type { Mission, Era } from '@bt-roster/core'

const STORAGE_KEY = 'bt-collections'

export type CollectionType = 'mech_collection' | 'roster'

export interface UnitRef {
  slug: string
  fullName: string
  variant: string
  tonnage: number
  bv: number
  role: string | null
  techBase: string
}

export interface CollectionEntry {
  type: 'unit'
  unitRef: UnitRef
  gunnery?: number
  piloting?: number
}

export interface Collection {
  id: string
  name: string
  collectionType: CollectionType
  entries: CollectionEntry[]
  /** When true, each entry represents any variant of its chassis (miniature proxy mode) */
  chassisProxy: boolean
  mission?: Mission
  era?: Era
  bvBudget?: number
  createdAt: string
  updatedAt: string
}

function generateId(): string {
  return crypto.randomUUID()
}

export function createCollection(name: string, collectionType: CollectionType): Collection {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    collectionType,
    entries: [],
    chassisProxy: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function loadCollections(): Collection[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Collection[]
  } catch {
    return []
  }
}

function persist(collections: Collection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
}

export function replaceAllCollections(collections: Collection[]): void {
  persist(collections)
}

export function saveCollection(collection: Collection): void {
  const all = loadCollections()
  const idx = all.findIndex(c => c.id === collection.id)
  if (idx >= 0) {
    all[idx] = collection
  } else {
    all.push(collection)
  }
  persist(all)
}

export function deleteCollection(id: string): void {
  const all = loadCollections()
  persist(all.filter(c => c.id !== id))
}

export function updateCollection(id: string, updates: Partial<Collection>): void {
  const all = loadCollections()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  persist(all)
}
