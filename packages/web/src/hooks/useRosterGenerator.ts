import { useState, useCallback } from 'react'
import {
  fetchUnits, generateRoster,
  computeBvFilterBounds, allowedRulesLevels,
  fetchUnitChassisSlug, fetchChassisVariants,
  type Roster, type FetchProgress, type UnitFilters, type Unit,
} from '@bt-roster/core'
import type { FormState } from './useFormState'
import { loadCollections } from '@/services/collections'

export type GeneratorStatus = 'idle' | 'fetching' | 'generating' | 'done' | 'error'

const ROSTERS_KEY = 'bt-last-rosters'

function loadSavedRosters(): { rosters: Roster[]; status: GeneratorStatus } {
  try {
    const raw = sessionStorage.getItem(ROSTERS_KEY)
    if (raw) {
      const rosters = JSON.parse(raw) as Roster[]
      if (rosters.length > 0) return { rosters, status: 'done' }
    }
  } catch {}
  return { rosters: [], status: 'idle' }
}

export function useRosterGenerator() {
  const saved = loadSavedRosters()
  const [status, setStatus] = useState<GeneratorStatus>(saved.status)
  const [progress, setProgress] = useState<FetchProgress | null>(null)
  const [rosters, setRosters] = useState<Roster[]>(saved.rosters)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (form: FormState) => {
    if (!form.mission || !form.era) return

    setStatus('fetching')
    setProgress(null)
    setRosters([])
    setError(null)

    try {
      let units: Unit[]
      let chassisGroupsMap: Map<string, string> | undefined
      const techBase = form.techBase || undefined
      const rulesLevel = form.rulesLevel

      if (form.unitSource === 'collection') {
        // Use collection as unit source — no API fetch needed
        const collections = loadCollections()
        const collection = collections.find(c => c.id === form.collectionId)
        if (!collection || collection.entries.length === 0) {
          setError('Selected collection is empty. Add mechs to it first.')
          setStatus('error')
          return
        }

        if (collection.chassisProxy) {
          // Expand each entry to all variants of its chassis.
          const totalEntries = collection.entries.length
          setProgress({ page: 1, fetched: 0, total: totalEntries })

          // Map each entry to its chassis slug and count per chassis
          const chassisCounts = new Map<string, number>()
          for (let ei = 0; ei < collection.entries.length; ei++) {
            const cs = await fetchUnitChassisSlug(collection.entries[ei].unitRef.slug)
            if (cs) chassisCounts.set(cs, (chassisCounts.get(cs) ?? 0) + 1)
            setProgress({ page: 1, fetched: ei + 1, total: totalEntries })
          }

          // Fetch variants for each chassis, add N copies for N minis
          chassisGroupsMap = new Map<string, string>()
          units = []
          let chassisDone = 0
          const chassisTotal = chassisCounts.size
          for (const [cs, count] of chassisCounts) {
            const variants = await fetchChassisVariants(cs, rulesLevel)
            for (const v of variants) chassisGroupsMap.set(v.slug, cs)
            for (let i = 0; i < count; i++) {
              units.push(...variants.map(v => ({ ...v })))
            }
            chassisDone++
            setProgress({ page: 2, fetched: chassisDone, total: chassisTotal })
          }
        } else {
          // Use entries as-is
          units = collection.entries.map(e => ({
            slug: e.unitRef.slug,
            fullName: e.unitRef.fullName,
            variant: e.unitRef.variant,
            tonnage: e.unitRef.tonnage,
            bv: e.unitRef.bv,
            role: e.unitRef.role,
            techBase: e.unitRef.techBase,
            rulesLevel: e.unitRef.rulesLevel ?? '',
          }) as Unit)
        }

        // Apply client-side filters
        const { bvMin, bvMax } = computeBvFilterBounds(form.bv, form.count)
        const allowedLevels = new Set(allowedRulesLevels(rulesLevel))
        units = units.filter(u => {
          if (techBase && u.techBase.toLowerCase() !== techBase.toLowerCase()) return false
          if (u.bv < bvMin || u.bv > bvMax) return false
          if (u.rulesLevel && !allowedLevels.has(u.rulesLevel.toLowerCase())) return false
          return true
        })
      } else {
        // Fetch from API
        const { bvMin, bvMax } = computeBvFilterBounds(form.bv, form.count)

        const filters: UnitFilters = {
          era: form.era,
          factionType: form.factionType || undefined,
          factionSlug: form.factionSlug || undefined,
          unitType: 'MECH',
          techBase,
          maxRulesLevel: rulesLevel,
          bvMin,
          bvMax,
        }

        units = await fetchUnits(filters, setProgress)
      }

      if (units.length === 0) {
        setError('No units found matching your filters. Try broadening era, faction, or BV range.')
        setStatus('error')
        return
      }

      setStatus('generating')

      // Allow UI to update before running synchronous generation
      await new Promise(r => setTimeout(r, 0))

      const baseSeed = form.seed ? parseInt(form.seed, 10) : Math.floor(Math.random() * 1_000_000)
      const numVariants = Math.max(1, Math.min(form.variants, 10))
      const results: Roster[] = []

      for (let v = 0; v < numVariants; v++) {
        // For chassis proxy, pass fresh copy of units each time (generator mutates pool)
        const poolForVariant = chassisGroupsMap ? units.map(u => ({ ...u })) : units
        const roster = generateRoster(poolForVariant, form.count, form.bv, form.mission, form.era, {
          gunnery: form.pilotMode === 'fixed' ? form.gunnery : 4,
          piloting: form.pilotMode === 'fixed' ? form.piloting : 5,
          autoPilots: form.pilotMode === 'auto',
          factionType: form.factionType || undefined,
          factionSlug: form.factionSlug || undefined,
          seed: baseSeed + v,
          chassisGroups: chassisGroupsMap,
        })
        results.push(roster)
      }

      setRosters(results)
      setStatus('done')
      try { sessionStorage.setItem(ROSTERS_KEY, JSON.stringify(results)) } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }, [])

  return { status, progress, rosters, error, generate }
}
