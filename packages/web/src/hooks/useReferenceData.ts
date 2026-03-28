import { useState, useEffect } from 'react'
import { fetchEras, fetchFactions, type EraInfo, type FactionInfo, type FactionType } from '@bt-roster/core'

export function useReferenceData() {
  const [eras, setEras] = useState<EraInfo[]>([])
  const [factions, setFactions] = useState<FactionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [erasData, factionsData] = await Promise.all([
          fetchEras(),
          fetchFactions(),
        ])
        if (!cancelled) {
          setEras(erasData)
          setFactions(factionsData)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reference data')
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const factionsByType = (type: FactionType | undefined) => {
    if (!type) return factions
    const ftLower = type.toLowerCase()
    return factions.filter(f => f.factionType.toLowerCase() === ftLower)
  }

  return { eras, factions, factionsByType, loading, error }
}
