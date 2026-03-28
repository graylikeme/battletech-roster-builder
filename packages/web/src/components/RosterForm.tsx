import {
  MISSIONS, ERAS, FACTION_TYPES, TECH_BASES, MISSION_PROFILES,
  type Mission, type Era, type FactionType, type TechBase,
} from '@bt-roster/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { FormState } from '@/hooks/useFormState'
import type { EraInfo, FactionInfo } from '@bt-roster/core'
import type { GeneratorStatus } from '@/hooks/useRosterGenerator'

interface RosterFormProps {
  form: FormState
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  isValid: boolean
  eras: EraInfo[]
  factions: FactionInfo[]
  factionsByType: (type: FactionType | undefined) => FactionInfo[]
  status: GeneratorStatus
  onGenerate: () => void
}

export function RosterForm({ form, setField, isValid, eras, factions, factionsByType, status, onGenerate }: RosterFormProps) {
  const isLoading = status === 'fetching' || status === 'generating'
  const availableFactions = factionsByType(form.factionType as FactionType || undefined)

  return (
    <div className="space-y-6">
      {/* Mission */}
      <div className="space-y-2">
        <Label>Mission</Label>
        <Select value={form.mission} onValueChange={v => setField('mission', v as Mission)}>
          <SelectTrigger><SelectValue placeholder="Select mission..." /></SelectTrigger>
          <SelectContent>
            {MISSIONS.map(m => (
              <SelectItem key={m} value={m}>{MISSION_PROFILES[m].name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.mission && (
          <p className="text-xs text-muted-foreground">{MISSION_PROFILES[form.mission as Mission]?.description}</p>
        )}
      </div>

      {/* BV + Count */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>BV Budget</Label>
          <Input
            type="number" min={500} step={500}
            value={form.bv}
            onChange={e => setField('bv', parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Mech Count</Label>
          <Input
            type="number" min={1} max={12}
            value={form.count}
            onChange={e => setField('count', parseInt(e.target.value, 10) || 1)}
          />
        </div>
      </div>

      {/* Era */}
      <div className="space-y-2">
        <Label>Era</Label>
        <Select value={form.era} onValueChange={v => setField('era', v as Era)}>
          <SelectTrigger><SelectValue placeholder="Select era..." /></SelectTrigger>
          <SelectContent>
            {eras.map(e => (
              <SelectItem key={e.slug} value={eraSlugToEnum(e.slug)}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Filters */}
      <details className="space-y-4">
        <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
          Advanced Filters
        </summary>
        <div className="space-y-4 pt-2">
          {/* Faction Type */}
          <div className="space-y-2">
            <Label>Faction Type</Label>
            <Select value={form.factionType} onValueChange={v => { setField('factionType', v as FactionType); setField('factionSlug', ''); }}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {FACTION_TYPES.map(ft => (
                  <SelectItem key={ft} value={ft}>{ft.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Faction */}
          {availableFactions.length > 0 && (
            <div className="space-y-2">
              <Label>Faction</Label>
              <Select value={form.factionSlug} onValueChange={v => setField('factionSlug', v)}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {availableFactions.map(f => (
                    <SelectItem key={f.slug} value={f.slug}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tech Base */}
          <div className="space-y-2">
            <Label>Tech Base</Label>
            <Select value={form.techBase} onValueChange={v => setField('techBase', v as TechBase)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {TECH_BASES.map(tb => (
                  <SelectItem key={tb} value={tb}>{tb.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variants + Seed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Variants</Label>
              <Input
                type="number" min={1} max={10}
                value={form.variants}
                onChange={e => setField('variants', parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Seed (optional)</Label>
              <Input
                type="number" placeholder="Random"
                value={form.seed}
                onChange={e => setField('seed', e.target.value)}
              />
            </div>
          </div>

          {/* Pilot Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.pilotMode === 'auto'}
                onCheckedChange={v => setField('pilotMode', v ? 'auto' : 'fixed')}
              />
              <Label>Auto-assign pilot skills</Label>
            </div>
            {form.pilotMode === 'fixed' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gunnery</Label>
                  <Input
                    type="number" min={0} max={8}
                    value={form.gunnery}
                    onChange={e => setField('gunnery', parseInt(e.target.value, 10) || 4)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Piloting</Label>
                  <Input
                    type="number" min={0} max={8}
                    value={form.piloting}
                    onChange={e => setField('piloting', parseInt(e.target.value, 10) || 5)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </details>

      {/* Generate */}
      <Button
        className="w-full"
        size="lg"
        disabled={!isValid || isLoading}
        onClick={onGenerate}
      >
        {isLoading ? (status === 'fetching' ? 'Fetching units...' : 'Generating...') : 'Generate Roster'}
      </Button>
    </div>
  )
}

function eraSlugToEnum(slug: string): Era {
  const map: Record<string, Era> = {
    'age-of-war': 'AGE_OF_WAR',
    'star-league': 'STAR_LEAGUE',
    'early-succession-wars': 'EARLY_SUCCESSION_WARS',
    'late-succession-wars': 'LATE_SUCCESSION_WARS',
    'renaissance': 'RENAISSANCE',
    'clan-invasion': 'CLAN_INVASION',
    'civil-war': 'CIVIL_WAR',
    'jihad': 'JIHAD',
    'dark-age': 'DARK_AGE',
    'ilclan': 'IL_CLAN',
  }
  return map[slug] ?? slug.toUpperCase().replace(/-/g, '_') as Era
}
