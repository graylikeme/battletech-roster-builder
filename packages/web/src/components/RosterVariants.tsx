import type { Roster } from '@bt-roster/core'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RosterDisplay } from './RosterDisplay'

interface RosterVariantsProps {
  rosters: Roster[]
}

export function RosterVariants({ rosters }: RosterVariantsProps) {
  if (rosters.length === 0) return null

  if (rosters.length === 1) {
    return <RosterDisplay roster={rosters[0]} />
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
          <RosterDisplay roster={roster} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
