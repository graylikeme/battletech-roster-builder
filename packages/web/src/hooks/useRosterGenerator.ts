import { useState, useCallback } from 'react'
import {
  fetchUnits, generateRoster,
  effectiveRulesLevel, computeBvFilterBounds,
  type Roster, type FetchProgress, type UnitFilters, type Unit,
} from '@bt-roster/core'
import type { FormState } from './useFormState'
import { loadCollections } from '@/services/collections'

export type GeneratorStatus = 'idle' | 'fetching' | 'generating' | 'done' | 'error'

export function useRosterGenerator() {
  const [status, setStatus] = useState<GeneratorStatus>('idle')
  const [progress, setProgress] = useState<FetchProgress | null>(null)
  const [rosters, setRosters] = useState<Roster[]>([])
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (form: FormState) => {
    if (!form.mission || !form.era) return

    setStatus('fetching')
    setProgress(null)
    setRosters([])
    setError(null)

    try {
      let units: Unit[]

      if (form.unitSource === 'collection') {
        // Use collection as unit source — no API fetch needed
        const collections = loadCollections()
        const collection = collections.find(c => c.id === form.collectionId)
        if (!collection || collection.entries.length === 0) {
          setError('Selected collection is empty. Add mechs to it first.')
          setStatus('error')
          return
        }
        const { bvMin, bvMax } = computeBvFilterBounds(form.bv, form.count)
        const techBase = form.techBase || undefined

        units = collection.entries
          .map(e => ({
            slug: e.unitRef.slug,
            fullName: e.unitRef.fullName,
            variant: e.unitRef.variant,
            tonnage: e.unitRef.tonnage,
            bv: e.unitRef.bv,
            role: e.unitRef.role,
            techBase: e.unitRef.techBase,
            rulesLevel: '',
          }) as Unit)
          .filter(u => {
            if (techBase && u.techBase.toLowerCase() !== techBase.toLowerCase()) return false
            if (u.bv < bvMin || u.bv > bvMax) return false
            return true
          })
      } else {
        // Fetch from API
        const techBase = form.techBase || undefined
        const { rulesLevel } = effectiveRulesLevel(techBase, form.rulesLevel)
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
        const roster = generateRoster(units, form.count, form.bv, form.mission, form.era, {
          gunnery: form.pilotMode === 'fixed' ? form.gunnery : 4,
          piloting: form.pilotMode === 'fixed' ? form.piloting : 5,
          autoPilots: form.pilotMode === 'auto',
          factionType: form.factionType || undefined,
          factionSlug: form.factionSlug || undefined,
          seed: baseSeed + v,
        })
        results.push(roster)
      }

      setRosters(results)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }, [])

  return { status, progress, rosters, error, generate }
}
