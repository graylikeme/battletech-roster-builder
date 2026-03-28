import { useState } from 'react'
import { weightClassFromTonnage, MISSION_PROFILES, type Roster } from '@bt-roster/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { MechDetailCard } from './MechDetailCard'

const WEIGHT_CLASS_COLORS: Record<string, string> = {
  LIGHT: 'text-blue-400',
  MEDIUM: 'text-green-400',
  HEAVY: 'text-amber-400',
  ASSAULT: 'text-red-400',
}

const WEIGHT_CLASS_BAR: Record<string, string> = {
  LIGHT: 'bg-blue-500',
  MEDIUM: 'bg-green-500',
  HEAVY: 'bg-amber-500',
  ASSAULT: 'bg-red-500',
}

interface RosterDisplayProps {
  roster: Roster
  requestedCount?: number
  onSave?: () => void
}

export function RosterDisplay({ roster, requestedCount, onSave }: RosterDisplayProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const profile = MISSION_PROFILES[roster.mission]
  const pct = roster.bvBudget > 0 ? (roster.bvUsed / roster.bvBudget * 100).toFixed(1) : '0.0'
  const eraLabel = roster.era.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{profile.name}</h3>
          {onSave && <Button size="sm" onClick={onSave}>Save Roster</Button>}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{eraLabel}</span>
          {roster.factionType && (
            <>
              <span>|</span>
              <span>{roster.factionType.replace(/_/g, ' ')}</span>
            </>
          )}
          {roster.factionSlug && (
            <span className="text-xs">({roster.factionSlug})</span>
          )}
        </div>
        <div className="flex gap-4 text-sm">
          <span>Budget: <span className="font-mono font-semibold">{roster.bvBudget}</span></span>
          <span>Used: <span className="font-mono font-semibold">{roster.bvUsed}</span> ({pct}%)</span>
          <span>Remaining: <span className="font-mono font-semibold">{roster.bvRemaining}</span></span>
        </div>
        {requestedCount && roster.entries.length < requestedCount && (
          <p className="text-sm text-amber-400">
            Only {roster.entries.length} of {requestedCount} mechs could be filled.
            Remaining units in the pool exceed the BV budget. Try increasing BV, reducing count, or adding cheaper mechs to the collection.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Tons</TableHead>
              <TableHead className="text-center">Pilot</TableHead>
              <TableHead className="text-right">BV</TableHead>
              <TableHead className="text-right">Adj BV</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.entries.map((entry, i) => {
              const wc = weightClassFromTonnage(entry.unit.tonnage)
              const isExpanded = expandedSlug === entry.unit.slug
              return (
                <>
                  <TableRow
                    key={entry.unit.slug}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setExpandedSlug(isExpanded ? null : entry.unit.slug)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-6 rounded-full shrink-0 ${WEIGHT_CLASS_BAR[wc] ?? ''}`} />
                        {entry.unit.fullName}
                        <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.unit.variant}</TableCell>
                    <TableCell className="text-right font-mono">{Math.floor(entry.unit.tonnage)}</TableCell>
                    <TableCell className="text-center font-mono">{entry.gunnery}/{entry.piloting}</TableCell>
                    <TableCell className="text-right font-mono">{entry.baseBv}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{entry.adjustedBv}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={WEIGHT_CLASS_COLORS[wc]}>
                        {entry.unit.role ?? '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${entry.unit.slug}-detail`}>
                      <TableCell colSpan={7} className="p-0 bg-muted/30">
                        <MechDetailCard slug={entry.unit.slug} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">TOTAL</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono font-semibold">{Math.floor(roster.totalTonnage)}</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono">{roster.entries.reduce((s, e) => s + e.baseBv, 0)}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{roster.bvUsed}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
