import { useState } from 'react'
import type { Roster } from '@bt-roster/core'
import type { Collection, CollectionEntry, UnitRef } from '@/services/collections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

interface SaveRosterDialogProps {
  open: boolean
  roster: Roster | null
  collections: Collection[]
  onSaveNew: (name: string) => void
  onSaveToExisting: (collectionId: string) => void
  onClose: () => void
}

export function rosterToEntries(roster: Roster): CollectionEntry[] {
  return roster.entries.map(e => ({
    type: 'unit' as const,
    unitRef: {
      slug: e.unit.slug,
      fullName: e.unit.fullName,
      variant: e.unit.variant,
      tonnage: e.unit.tonnage,
      bv: e.unit.bv,
      role: e.unit.role,
      techBase: e.unit.techBase,
    } satisfies UnitRef,
    gunnery: e.gunnery,
    piloting: e.piloting,
  }))
}

export function SaveRosterDialog({ open, roster, collections, onSaveNew, onSaveToExisting, onClose }: SaveRosterDialogProps) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')

  if (!roster) return null

  const handleSave = () => {
    if (mode === 'new' && name.trim()) {
      onSaveNew(name.trim())
      setName('')
      onClose()
    } else if (mode === 'existing' && selectedId) {
      onSaveToExisting(selectedId)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Roster</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={mode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('new')}
            >
              New Collection
            </Button>
            <Button
              variant={mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('existing')}
              disabled={collections.length === 0}
            >
              Add to Existing
            </Button>
          </div>

          {mode === 'new' ? (
            <div className="space-y-2">
              <Label>Collection Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Saturday Game Lance"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Collection</Label>
              <Select value={selectedId} onValueChange={v => setSelectedId(v ?? '')}>
                <SelectTrigger>{collections.find(c => c.id === selectedId)?.name ?? <span className="text-muted-foreground">Choose...</span>}</SelectTrigger>
                <SelectContent>
                  {collections.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={mode === 'new' ? !name.trim() : !selectedId}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
