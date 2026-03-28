import { useState, useCallback } from 'react'
import {
  loadCollections,
  saveCollection,
  deleteCollection as deleteCollectionStorage,
  updateCollection as updateCollectionStorage,
  createCollection,
  type Collection,
  type CollectionType,
  type CollectionEntry,
} from '@/services/collections'

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(loadCollections)

  const refresh = useCallback(() => setCollections(loadCollections()), [])

  const create = useCallback((name: string, type: CollectionType) => {
    const c = createCollection(name, type)
    saveCollection(c)
    refresh()
    return c
  }, [refresh])

  const save = useCallback((collection: Collection) => {
    saveCollection(collection)
    refresh()
  }, [refresh])

  const remove = useCallback((id: string) => {
    deleteCollectionStorage(id)
    refresh()
  }, [refresh])

  const rename = useCallback((id: string, name: string) => {
    updateCollectionStorage(id, { name })
    refresh()
  }, [refresh])

  const changeType = useCallback((id: string, collectionType: CollectionType) => {
    updateCollectionStorage(id, { collectionType })
    refresh()
  }, [refresh])

  const addEntry = useCallback((id: string, entry: CollectionEntry) => {
    const all = loadCollections()
    const c = all.find(c => c.id === id)
    if (!c) return
    c.entries.push(entry)
    saveCollection(c)
    refresh()
  }, [refresh])

  const removeEntry = useCallback((id: string, entryIndex: number) => {
    const all = loadCollections()
    const c = all.find(c => c.id === id)
    if (!c) return
    c.entries.splice(entryIndex, 1)
    saveCollection(c)
    refresh()
  }, [refresh])

  const updateEntry = useCallback((id: string, entryIndex: number, updates: Partial<CollectionEntry>) => {
    const all = loadCollections()
    const c = all.find(c => c.id === id)
    if (!c || !c.entries[entryIndex]) return
    c.entries[entryIndex] = { ...c.entries[entryIndex], ...updates }
    saveCollection(c)
    refresh()
  }, [refresh])

  const toggleChassisProxy = useCallback((id: string) => {
    const all = loadCollections()
    const c = all.find(c => c.id === id)
    if (!c) return
    updateCollectionStorage(id, { chassisProxy: !c.chassisProxy } as Partial<Collection>)
    refresh()
  }, [refresh])

  const byType = useCallback((type?: CollectionType) => {
    if (!type) return collections
    return collections.filter(c => c.collectionType === type)
  }, [collections])

  return {
    collections,
    byType,
    create,
    remove,
    rename,
    changeType,
    save,
    addEntry,
    removeEntry,
    updateEntry,
    toggleChassisProxy,
  }
}
