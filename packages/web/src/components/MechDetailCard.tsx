import { useState, useEffect } from 'react'
import { fetchUnitDetail, type MechDetail } from '@bt-roster/core'
import { DownloadIcon, PrinterIcon, LoaderCircleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useRecordSheet } from '@/hooks/useRecordSheet'

interface MechDetailCardProps {
  slug: string
  gunnery?: number
  piloting?: number
}

const LOCATION_ORDER = [
  'head', 'center_torso', 'left_torso', 'right_torso',
  'left_arm', 'right_arm', 'left_leg', 'right_leg',
]

function formatLocation(loc: string): string {
  return loc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatQuirk(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function MechDetailCard({ slug, gunnery, piloting }: MechDetailCardProps) {
  const [detail, setDetail] = useState<MechDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { downloadSingle, printSingle, isGenerating } = useRecordSheet()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchUnitDetail(slug)
      .then(d => { if (!cancelled) { setDetail(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return <p className="text-xs text-muted-foreground animate-pulse p-2">Loading details...</p>
  }
  if (error || !detail) {
    return <p className="text-xs text-destructive p-2">Failed to load: {error}</p>
  }

  // Group loadout by location, filter out heat sinks
  const weaponsByLocation = new Map<string, typeof detail.loadout>()
  for (const entry of detail.loadout) {
    if (entry.equipmentName === 'Heat Sink' || entry.equipmentName === 'ISDoubleHeatSink') continue
    const loc = entry.location
    if (!weaponsByLocation.has(loc)) weaponsByLocation.set(loc, [])
    weaponsByLocation.get(loc)!.push(entry)
  }

  // Sort locations
  const sortedLocations = [...weaponsByLocation.entries()].sort(
    ([a], [b]) => LOCATION_ORDER.indexOf(a) - LOCATION_ORDER.indexOf(b)
  )

  const totalArmor = detail.locations.reduce((sum, l) => sum + (l.armorPoints ?? 0) + (l.rearArmor ?? 0), 0)

  return (
    <div className="space-y-3 p-3 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{detail.fullName}</div>
          <div className="text-xs text-muted-foreground">
            {detail.tonnage}t {detail.techBase.replace(/_/g, ' ')} | {detail.rulesLevel} | Intro: {detail.introYear ?? '?'}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm" variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isGenerating}
            onClick={e => { e.stopPropagation(); downloadSingle(slug, { gunnery, piloting }) }}
          >
            {isGenerating
              ? <LoaderCircleIcon className="w-3.5 h-3.5 animate-spin" />
              : <DownloadIcon className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isGenerating}
            onClick={e => { e.stopPropagation(); printSingle(slug, { gunnery, piloting }) }}
          >
            <PrinterIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Movement + Engine */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>Walk/Run/Jump</div>
        <div className="font-mono">{detail.walkMp ?? '-'}/{detail.runMp ?? '-'}/{detail.jumpMp ?? 0}</div>
        <div>Engine</div>
        <div className="font-mono">{detail.engineName ?? '-'} ({detail.engineRating ?? '-'})</div>
        <div>Heat Sinks</div>
        <div className="font-mono">{detail.heatSinkCount ?? '-'} {detail.heatSinkType ?? ''}</div>
        <div>Armor</div>
        <div className="font-mono">{totalArmor} pts ({detail.armorType ?? 'Standard'})</div>
      </div>

      <Separator />

      {/* Loadout */}
      <div>
        <div className="text-xs font-medium mb-1">Loadout</div>
        {sortedLocations.map(([loc, entries]) => (
          <div key={loc} className="mb-1">
            <div className="text-xs text-muted-foreground">{formatLocation(loc)}</div>
            {entries.map((e, i) => (
              <div key={i} className="text-xs pl-3 font-mono">
                {e.equipmentName}{e.quantity > 1 && !e.equipmentName.startsWith('IS Ammo') ? ` x${e.quantity}` : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Armor by location */}
      <Separator />
      <div>
        <div className="text-xs font-medium mb-1">Armor</div>
        <div className="grid grid-cols-2 gap-x-4 text-xs">
          {detail.locations
            .sort((a, b) => LOCATION_ORDER.indexOf(a.location) - LOCATION_ORDER.indexOf(b.location))
            .map(l => (
              <div key={l.location} className="flex justify-between font-mono">
                <span className="text-muted-foreground">{formatLocation(l.location)}</span>
                <span>{l.armorPoints ?? 0}{l.rearArmor != null ? `/${l.rearArmor}` : ''}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Quirks */}
      {detail.quirks.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="text-xs font-medium mb-1">Quirks</div>
            <div className="flex flex-wrap gap-1">
              {detail.quirks.map((q, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={`text-xs ${q.isPositive ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatQuirk(q.name)}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
