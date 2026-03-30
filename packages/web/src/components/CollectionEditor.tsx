import { useState } from 'react'
import { weightClassFromTonnage, adjustedBv } from '@bt-roster/core'
import { DownloadIcon, PrinterIcon, LoaderCircleIcon } from 'lucide-react'
import type { Collection, CollectionEntry } from '@/services/collections'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { MechDetailCard } from './MechDetailCard'
import { useRecordSheet } from '@/hooks/useRecordSheet'

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

interface CollectionEditorProps {
  collection: Collection
  onRemoveEntry: (index: number) => void
  onUpdateEntry: (index: number, updates: Partial<CollectionEntry>) => void
  onBrowseMechs: () => void
  onToggleChassisProxy: () => void
  onRename: (name: string) => void
  onChangeType: () => void
  onDelete: () => void
}

function chassisName(entry: CollectionEntry): string {
  const full = entry.unitRef.fullName
  const variant = entry.unitRef.variant
  return variant ? full.replace(variant, '').replace(/\s+$/, '') : full
}

interface ChassisGroup {
  name: string
  tonnage: number
  count: number
  indices: number[]
}

function groupByChassis(entries: CollectionEntry[]): ChassisGroup[] {
  const groups = new Map<string, ChassisGroup>()
  for (let i = 0; i < entries.length; i++) {
    const name = chassisName(entries[i])
    const existing = groups.get(name)
    if (existing) {
      existing.count++
      existing.indices.push(i)
    } else {
      groups.set(name, { name, tonnage: entries[i].unitRef.tonnage, count: 1, indices: [i] })
    }
  }
  return [...groups.values()]
}

export function CollectionEditor({ collection, onRemoveEntry, onUpdateEntry, onBrowseMechs, onToggleChassisProxy, onRename, onChangeType, onDelete }: CollectionEditorProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const { downloadRoster, printRoster, isGenerating, progress } = useRecordSheet()
  const isProxy = collection.chassisProxy && collection.collectionType === 'mech_collection'
  const colSpan = collection.collectionType === 'roster' ? 7 : 5
  const totalBv = collection.entries.reduce((sum, e) => sum + e.unitRef.bv, 0)
  const totalAdjBv = collection.collectionType === 'roster'
    ? collection.entries.reduce((sum, e) => sum + adjustedBv(e.unitRef.bv, e.gunnery ?? 4, e.piloting ?? 5), 0)
    : totalBv
  const totalTonnage = collection.entries.reduce((sum, e) => sum + e.unitRef.tonnage, 0)
  const chassisGroups = isProxy ? groupByChassis(collection.entries) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{collection.name}</h3>
            <Badge variant="outline" className="text-xs">
              {collection.collectionType === 'roster' ? 'Roster' : 'Pool'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {collection.entries.length} entries
            {collection.entries.length > 0 && ` | ${Math.floor(totalTonnage)}t | ${totalBv} BV`}
            {collection.collectionType === 'roster' && totalAdjBv !== totalBv && ` (${totalAdjBv} adj)`}
          </p>
        </div>
        <div className="flex gap-2">
          {collection.collectionType === 'roster' && collection.entries.length > 0 && (
            <>
              <Button
                size="sm" variant="outline"
                disabled={isGenerating}
                onClick={() => downloadRoster(
                  collection.entries.map(e => ({
                    slug: e.unitRef.slug,
                    gunnery: e.gunnery ?? 4,
                    piloting: e.piloting ?? 5,
                  })),
                  `${collection.name.toLowerCase().replace(/\s+/g, '-')}.pdf`,
                )}
              >
                {isGenerating
                  ? <LoaderCircleIcon className="w-3.5 h-3.5 animate-spin" />
                  : <DownloadIcon className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="sm" variant="outline"
                disabled={isGenerating}
                onClick={() => printRoster(
                  collection.entries.map(e => ({
                    slug: e.unitRef.slug,
                    gunnery: e.gunnery ?? 4,
                    piloting: e.piloting ?? 5,
                  })),
                )}
              >
                <PrinterIcon className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" onClick={onBrowseMechs}>Add Mechs</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="ghost" className="h-7 text-xs"
          onClick={() => {
            const name = prompt('Rename collection:', collection.name)
            if (name?.trim()) onRename(name.trim())
          }}
        >
          Rename
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs"
          onClick={onChangeType}
        >
          Convert to {collection.collectionType === 'roster' ? 'Pool' : 'Roster'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
          onClick={() => { if (confirm(`Delete "${collection.name}"?`)) onDelete() }}
        >
          Delete
        </Button>
      </div>

      {collection.collectionType === 'mech_collection' && (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Switch
            checked={collection.chassisProxy}
            onCheckedChange={onToggleChassisProxy}
          />
          <div>
            <Label className="text-sm font-medium">Chassis Proxy Mode</Label>
            <p className="text-xs text-muted-foreground">
              {collection.chassisProxy
                ? 'Each mech represents any variant of its chassis (for miniature proxying)'
                : 'Each mech is the specific variant listed'}
            </p>
          </div>
        </div>
      )}

      {collection.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No mechs in this collection. Click "Add Mechs" to browse the full mech list.
        </p>
      ) : isProxy && chassisGroups ? (
        /* Chassis proxy view: grouped by chassis */
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chassis</TableHead>
                <TableHead className="text-right">Tons</TableHead>
                <TableHead className="text-center">Minis</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {chassisGroups.map(group => {
                let wc: string
                try { wc = weightClassFromTonnage(group.tonnage) } catch { wc = 'MEDIUM' }
                return (
                  <TableRow key={group.name}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-6 rounded-full shrink-0 ${WEIGHT_CLASS_BAR[wc] ?? ''}`} />
                        {group.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{Math.floor(group.tonnage)}</TableCell>
                    <TableCell className="text-center font-mono">
                      {group.count > 1 ? `x${group.count}` : '1'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 px-2 text-xs text-destructive"
                        onClick={() => onRemoveEntry(group.indices[group.indices.length - 1])}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">{chassisGroups.length} chassis</TableCell>
                <TableCell />
                <TableCell className="text-center font-mono font-semibold">{collection.entries.length} minis</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      ) : (
        /* Normal variant view */
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Tons</TableHead>
                <TableHead className="text-right">BV</TableHead>
                <TableHead>Role</TableHead>
                {collection.collectionType === 'roster' && (
                  <>
                    <TableHead className="text-center w-20">Pilot</TableHead>
                    <TableHead className="text-right w-20">Adj BV</TableHead>
                  </>
                )}
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {collection.entries.map((entry, i) => {
                let wc: string
                try { wc = weightClassFromTonnage(entry.unitRef.tonnage) } catch { wc = 'MEDIUM' }
                const isExpanded = expandedSlug === entry.unitRef.slug
                return (
                <>
                <TableRow
                  key={i}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setExpandedSlug(isExpanded ? null : entry.unitRef.slug)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-6 rounded-full shrink-0 ${WEIGHT_CLASS_BAR[wc] ?? ''}`} />
                      {entry.unitRef.fullName}
                      <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{Math.floor(entry.unitRef.tonnage)}</TableCell>
                  <TableCell className="text-right font-mono">{entry.unitRef.bv}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={WEIGHT_CLASS_COLORS[wc]}>
                      {entry.unitRef.role ?? '-'}
                    </Badge>
                  </TableCell>
                  {collection.collectionType === 'roster' && (
                    <>
                      <TableCell>
                        <div className="flex items-center justify-center gap-0.5">
                          <Input
                            type="number" min={0} max={8}
                            className="w-10 h-7 text-center font-mono text-xs p-0"
                            value={entry.gunnery ?? 4}
                            onClick={e => e.stopPropagation()}
                            onChange={e => onUpdateEntry(i, { gunnery: parseInt(e.target.value, 10) || 4 })}
                          />
                          <span className="text-muted-foreground">/</span>
                          <Input
                            type="number" min={0} max={8}
                            className="w-10 h-7 text-center font-mono text-xs p-0"
                            value={entry.piloting ?? 5}
                            onClick={e => e.stopPropagation()}
                            onChange={e => onUpdateEntry(i, { piloting: parseInt(e.target.value, 10) || 5 })}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {adjustedBv(entry.unitRef.bv, entry.gunnery ?? 4, entry.piloting ?? 5)}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 px-2 text-xs text-destructive"
                      onClick={e => { e.stopPropagation(); onRemoveEntry(i) }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${entry.unitRef.slug}-detail`}>
                    <TableCell colSpan={colSpan} className="p-0 bg-muted/30">
                      <MechDetailCard slug={entry.unitRef.slug} gunnery={entry.gunnery} piloting={entry.piloting} />
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
                <TableCell className="text-right font-mono font-semibold">{Math.floor(totalTonnage)}</TableCell>
                <TableCell className="text-right font-mono">{totalBv}</TableCell>
                <TableCell />
                {collection.collectionType === 'roster' && (
                  <>
                    <TableCell />
                    <TableCell className="text-right font-mono font-semibold">{totalAdjBv}</TableCell>
                  </>
                )}
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  )
}
