import { useState } from 'react'
import type { Roster, Unit } from '@bt-roster/core'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useFormState } from '@/hooks/useFormState'
import { useRosterGenerator } from '@/hooks/useRosterGenerator'
import { useCollections } from '@/hooks/useCollections'
import { RosterForm } from '@/components/RosterForm'
import { RosterVariants } from '@/components/RosterVariants'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { ErrorBanner } from '@/components/ErrorBanner'
import { CollectionList } from '@/components/CollectionList'
import { CollectionEditor } from '@/components/CollectionEditor'
import { MechBrowser } from '@/components/MechBrowser'
import { SaveRosterDialog, rosterToEntries } from '@/components/SaveRosterDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createCollection,
  saveCollection,
  type Collection,
  type CollectionEntry,
} from '@/services/collections'

export function App() {
  const { eras, factions, factionsByType, loading: refLoading, error: refError } = useReferenceData()
  const { form, setField, isValid } = useFormState()
  const { status, progress, rosters, error, generate } = useRosterGenerator()
  const { collections, byType, create, remove, rename, changeType, addEntry, removeEntry, updateEntry, toggleChassisProxy } = useCollections()

  const [activeTab, setActiveTab] = useState<'generate' | 'collections'>('generate')
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showBrowser, setShowBrowser] = useState(false)
  const [saveRoster, setSaveRoster] = useState<Roster | null>(null)

  const handleAddEntry = (entry: CollectionEntry) => {
    if (!selectedCollection) return
    addEntry(selectedCollection.id, entry)
    // Refresh selected collection
    const updated = collections.find(c => c.id === selectedCollection.id)
    if (updated) setSelectedCollection({ ...updated })
  }

  const handleRemoveEntry = (index: number) => {
    if (!selectedCollection) return
    removeEntry(selectedCollection.id, index)
    const updated = collections.find(c => c.id === selectedCollection.id)
    if (updated) setSelectedCollection({ ...updated })
  }

  const handleSaveRosterNew = (name: string) => {
    if (!saveRoster) return
    const c = createCollection(name, 'roster')
    c.entries = rosterToEntries(saveRoster)
    c.mission = saveRoster.mission
    c.era = saveRoster.era
    c.bvBudget = saveRoster.bvBudget
    saveCollection(c)
    // Trigger refresh by calling create (which calls refresh internally)
    // Actually, we need to just reload
    window.location.reload() // Simple approach
  }

  const handleSaveRosterExisting = (collectionId: string) => {
    if (!saveRoster) return
    const entries = rosterToEntries(saveRoster)
    for (const entry of entries) {
      addEntry(collectionId, entry)
    }
  }

  // Keep selectedCollection in sync with collections state
  const currentCollection = selectedCollection
    ? collections.find(c => c.id === selectedCollection.id) ?? null
    : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BattleTech Roster Builder</h1>
            <p className="text-sm text-muted-foreground">Mission-driven roster generation for BattleTech Classic</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'generate' | 'collections')}>
          <TabsList className="mb-6">
            <TabsTrigger value="generate">Generate Roster</TabsTrigger>
            <TabsTrigger value="collections">Collections ({collections.length})</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
              <div className="space-y-4">
                {refError && <ErrorBanner message={refError} />}
                <div className="rounded-lg border border-border bg-card p-5">
                  <RosterForm
                    form={form}
                    setField={setField}
                    isValid={isValid && !refLoading}
                    eras={eras}
                    factions={factions}
                    factionsByType={factionsByType}
                    collections={collections}
                    status={status}
                    onGenerate={() => generate(form)}
                  />
                </div>
              </div>

              <div>
                {(status === 'fetching' || status === 'generating') && (
                  <LoadingOverlay status={status} progress={progress} />
                )}

                {status === 'error' && error && <ErrorBanner message={error} />}

                {status === 'done' && rosters.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setSaveRoster(rosters[0])}>
                        Save Roster
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-5">
                      <RosterVariants rosters={rosters} />
                    </div>
                  </div>
                )}

                {status === 'idle' && (
                  <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                    <p className="text-lg">Select a mission and parameters, then generate your roster.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections">
            <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
              <div className="rounded-lg border border-border bg-card p-5">
                <CollectionList
                  collections={collections}
                  byType={byType}
                  onCreate={create}
                  onSelect={setSelectedCollection}
                  selectedId={currentCollection?.id}
                />
              </div>

              <div>
                {currentCollection ? (
                  <div className="rounded-lg border border-border bg-card p-5">
                    <CollectionEditor
                      collection={currentCollection}
                      onRemoveEntry={handleRemoveEntry}
                      onUpdateEntry={(idx, updates) => { updateEntry(currentCollection.id, idx, updates) }}
                      onBrowseMechs={() => setShowBrowser(true)}
                      onToggleChassisProxy={() => toggleChassisProxy(currentCollection.id)}
                      onRename={name => rename(currentCollection.id, name)}
                      onChangeType={() => changeType(currentCollection.id, currentCollection.collectionType === 'roster' ? 'mech_collection' : 'roster')}
                      onDelete={() => { remove(currentCollection.id); setSelectedCollection(null) }}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                    <p className="text-lg">Select a collection to view and edit it.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mech Browser Dialog */}
      <MechBrowser
        open={showBrowser}
        onClose={() => setShowBrowser(false)}
        eras={eras}
        factions={factions}
        onAddEntry={handleAddEntry}
      />

      {/* Save Roster Dialog */}
      <SaveRosterDialog
        open={saveRoster !== null}
        roster={saveRoster}
        collections={collections}
        onSaveNew={handleSaveRosterNew}
        onSaveToExisting={handleSaveRosterExisting}
        onClose={() => setSaveRoster(null)}
      />
    </div>
  )
}
