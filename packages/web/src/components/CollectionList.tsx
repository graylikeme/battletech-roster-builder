import { useState } from 'react'
import type { Collection, CollectionType } from '@/services/collections'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface CollectionListProps {
  collections: Collection[]
  byType: (type?: CollectionType) => Collection[]
  onCreate: (name: string, type: CollectionType) => void
  onSelect: (collection: Collection) => void
  selectedId?: string
}

export function CollectionList({
  collections, byType, onCreate, onSelect, selectedId,
}: CollectionListProps) {
  const [filter, setFilter] = useState<CollectionType | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CollectionType>('mech_collection')

  const filtered = filter === 'all' ? collections : byType(filter)

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim(), newType)
    setFilter(newType)
    setNewName('')
    setShowCreate(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>New Collection</Button>
      </div>

      <Tabs value={filter} onValueChange={v => setFilter(v as CollectionType | 'all')}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All ({collections.length})</TabsTrigger>
          <TabsTrigger value="mech_collection" className="flex-1">
            Pools ({byType('mech_collection').length})
          </TabsTrigger>
          <TabsTrigger value="roster" className="flex-1">
            Rosters ({byType('roster').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No collections yet.</p>
      )}

      <div className="space-y-2">
        {filtered.map(c => (
          <Card
            key={c.id}
            className={`cursor-pointer transition-colors hover:border-primary ${c.id === selectedId ? 'border-primary' : ''}`}
            onClick={() => onSelect(c)}
          >
            <CardHeader className="p-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                <Badge variant="outline" className="text-xs shrink-0">
                  {c.collectionType === 'roster' ? 'Roster' : 'Pool'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {c.entries.length} {c.entries.length === 1 ? 'entry' : 'entries'}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. My Davion Miniatures"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={v => setNewType(v as CollectionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mech_collection">Mech Pool (for generation input)</SelectItem>
                  <SelectItem value="roster">Roster (saved roster)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
