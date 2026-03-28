import type { Roster } from '@bt-roster/core'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RosterDisplay } from './RosterDisplay'

interface RosterVariantsProps {
  rosters: Roster[]
  requestedCount?: number
  onSave?: () => void
}

export function RosterVariants({ rosters, requestedCount, onSave }: RosterVariantsProps) {
  if (rosters.length === 0) return null

  if (rosters.length === 1) {
    return <RosterDisplay roster={rosters[0]} requestedCount={requestedCount} onSave={onSave} />
  }

  return (
    <Tabs defaultValue="0">
      <TabsList>
        {rosters.map((_, i) => (
          <TabsTrigger key={i} value={String(i)}>
            Variant {i + 1}
          </TabsTrigger>
        ))}
      </TabsList>
      {rosters.map((roster, i) => (
        <TabsContent key={i} value={String(i)}>
          <RosterDisplay roster={roster} requestedCount={requestedCount} onSave={onSave} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
