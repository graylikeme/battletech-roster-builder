import { weightClassFromTonnage, adjustedBv } from '@bt-roster/core'
import type { Collection, CollectionEntry } from '@/services/collections'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const WEIGHT_CLASS_COLORS: Record<string, string> = {
  LIGHT: 'text-blue-400',
  MEDIUM: 'text-green-400',
  HEAVY: 'text-amber-400',
  ASSAULT: 'text-red-400',
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

export function CollectionEditor({ collection, onRemoveEntry, onUpdateEntry, onBrowseMechs, onToggleChassisProxy, onRename, onChangeType, onDelete }: CollectionEditorProps) {
  const totalBv = collection.entries.reduce((sum, e) => sum + e.unitRef.bv, 0)
  const totalAdjBv = collection.collectionType === 'roster'
    ? collection.entries.reduce((sum, e) => sum + adjustedBv(e.unitRef.bv, e.gunnery ?? 4, e.piloting ?? 5), 0)
    : totalBv
  const totalTonnage = collection.entries.reduce((sum, e) => sum + e.unitRef.tonnage, 0)

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
        <Button size="sm" onClick={onBrowseMechs}>Add Mechs</Button>
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
      ) : (
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
                return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{entry.unitRef.fullName}</TableCell>
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
                            onChange={e => onUpdateEntry(i, { gunnery: parseInt(e.target.value, 10) || 4 })}
                          />
                          <span className="text-muted-foreground">/</span>
                          <Input
                            type="number" min={0} max={8}
                            className="w-10 h-7 text-center font-mono text-xs p-0"
                            value={entry.piloting ?? 5}
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
                      onClick={() => onRemoveEntry(i)}
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
