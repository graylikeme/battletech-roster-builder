import { useState, useCallback } from 'react'
import {
  fetchUnits, generateRoster,
  effectiveRulesLevel, computeBvFilterBounds,
  type Roster, type FetchProgress, type UnitFilters,
} from '@bt-roster/core'
import type { FormState } from './useFormState'

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

      const units = await fetchUnits(filters, setProgress)

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
