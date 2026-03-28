import { useState, useCallback, useEffect, useRef } from 'react'
import {
  weightClassFromTonnage,
  TECH_BASES, ROLES, FACTION_TYPES,
  type Unit, type FactionType,
} from '@bt-roster/core'
import type { CollectionEntry, UnitRef } from '@/services/collections'
import type { EraInfo, FactionInfo } from '@bt-roster/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const API_URL = import.meta.env.DEV ? '/api/graphql' : 'https://api.battledroids.ru/graphql'

const SEARCH_QUERY = `
query Search($first: Int!, $after: String, $nameSearch: String, $unitType: UnitTypeFilter,
  $techBase: TechBaseFilter, $eraSlug: EraFilter, $role: String,
  $factionTypes: [FactionTypeFilter!], $factionSlug: String) {
  units(first: $first, after: $after, nameSearch: $nameSearch, unitType: $unitType,
    techBase: $techBase, eraSlug: $eraSlug, role: $role,
    factionTypes: $factionTypes, factionSlug: $factionSlug) {
    pageInfo { hasNextPage endCursor totalCount }
    edges { node { slug fullName variant tonnage bv role techBase rulesLevel introYear mechData { walkMp runMp jumpMp } } }
  }
}`

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

interface Filters {
  techBase: string
  era: string
  role: string
  factionType: string
  factionSlug: string
}

interface SearchResult {
  units: Unit[]
  totalCount: number
  hasNextPage: boolean
  endCursor: string | null
}

async function searchUnits(query: string, filters: Filters, after?: string): Promise<SearchResult> {
  const variables: Record<string, unknown> = {
    first: 50,
    after: after ?? null,
    nameSearch: query || null,
    unitType: 'MECH',
  }
  if (filters.techBase) variables.techBase = filters.techBase
  if (filters.era) variables.eraSlug = filters.era
  if (filters.role) variables.role = filters.role
  if (filters.factionType) variables.factionTypes = [filters.factionType]
  if (filters.factionSlug) variables.factionSlug = filters.factionSlug

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SEARCH_QUERY, variables }),
  })
  const json = await resp.json()
  const conn = json.data.units
  let units: Unit[] = conn.edges.map((e: { node: Record<string, unknown> }) => {
    const n = e.node
    const md = (n.mechData ?? {}) as Record<string, unknown>
    return {
      slug: n.slug, fullName: n.fullName, variant: n.variant ?? '',
      tonnage: n.tonnage, bv: n.bv, role: n.role ?? null,
      techBase: n.techBase ?? '', rulesLevel: n.rulesLevel ?? '',
      introYear: n.introYear, walkMp: md.walkMp, runMp: md.runMp, jumpMp: md.jumpMp,
    } as Unit
  }).filter((u: Unit) => u.bv != null)

  return {
    units,
    totalCount: conn.pageInfo.totalCount,
    hasNextPage: conn.pageInfo.hasNextPage,
    endCursor: conn.pageInfo.endCursor,
  }
}

interface MechBrowserProps {
  open: boolean
  onClose: () => void
  onAddEntry: (entry: CollectionEntry) => void
  eras: EraInfo[]
  factions: FactionInfo[]
}

const ERA_SLUG_MAP: Record<string, string> = {
  'age-of-war': 'AGE_OF_WAR', 'star-league': 'STAR_LEAGUE',
  'early-succession-wars': 'EARLY_SUCCESSION_WARS', 'late-succession-wars': 'LATE_SUCCESSION_WARS',
  'renaissance': 'RENAISSANCE', 'clan-invasion': 'CLAN_INVASION',
  'civil-war': 'CIVIL_WAR', 'jihad': 'JIHAD', 'dark-age': 'DARK_AGE', 'ilclan': 'IL_CLAN',
}

export function MechBrowser({ open, onClose, onAddEntry, eras, factions }: MechBrowserProps) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({ techBase: '', era: '', role: '', factionType: '', factionSlug: '' })
  const [results, setResults] = useState<Unit[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [addedSlug, setAddedSlug] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const doSearch = useCallback(async (q: string, f: Filters, append = false, afterCursor?: string) => {
    setLoading(true)
    loadingRef.current = true
    try {
      const result = await searchUnits(q, f, afterCursor)
      setResults(prev => append ? [...prev, ...result.units] : result.units)
      setTotalCount(result.totalCount)
      setHasMore(result.hasNextPage)
      setCursor(result.endCursor)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  // Auto-search on open
  useEffect(() => {
    if (open && results.length === 0 && !loading) {
      doSearch('', filters)
    }
  }, [open])

  // Debounced search on query or filter change
  const triggerSearch = useCallback((q: string, f: Filters) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q, f), 400)
  }, [doSearch])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    triggerSearch(value, filters)
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    // Clear specific faction when faction type changes
    if (key === 'factionType') newFilters.factionSlug = ''
    setFilters(newFilters)
    triggerSearch(query, newFilters)
  }

  const availableFactions = filters.factionType
    ? factions.filter(f => f.factionType.toLowerCase() === filters.factionType.toLowerCase())
    : factions

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current && cursor) {
        doSearch(query, filtersRef.current, true, cursor)
      }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [cursor, query, doSearch])

  const addUnit = (unit: Unit) => {
    const ref: UnitRef = {
      slug: unit.slug, fullName: unit.fullName, variant: unit.variant,
      tonnage: unit.tonnage, bv: unit.bv, role: unit.role, techBase: unit.techBase,
    }
    onAddEntry({ type: 'unit', unitRef: ref })
    setAddedSlug(unit.slug)
    setTimeout(() => setAddedSlug(null), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Mechs</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search by name..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          className="mb-1"
        />

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filters.era} onValueChange={v => handleFilterChange('era', v)}>
            <SelectTrigger className="w-auto">
              {filters.era ? eras.find(e => ERA_SLUG_MAP[e.slug] === filters.era)?.name ?? filters.era : <span className="text-muted-foreground">Era</span>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Era</SelectItem>
              {eras.map(e => (
                <SelectItem key={e.slug} value={ERA_SLUG_MAP[e.slug] ?? e.slug}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.factionType} onValueChange={v => handleFilterChange('factionType', v)}>
            <SelectTrigger className="w-auto">
              {filters.factionType ? filters.factionType.replace(/_/g, ' ') : <span className="text-muted-foreground">Faction Type</span>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Type</SelectItem>
              {FACTION_TYPES.map(ft => (
                <SelectItem key={ft} value={ft}>{ft.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableFactions.length > 0 && (
            <Select value={filters.factionSlug} onValueChange={v => handleFilterChange('factionSlug', v)}>
              <SelectTrigger className="w-auto">
                {availableFactions.find(f => f.slug === filters.factionSlug)?.name ?? <span className="text-muted-foreground">Faction</span>}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Faction</SelectItem>
                {availableFactions.map(f => (
                  <SelectItem key={f.slug} value={f.slug}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filters.techBase} onValueChange={v => handleFilterChange('techBase', v)}>
            <SelectTrigger className="w-auto">
              {filters.techBase ? filters.techBase.replace(/_/g, ' ') : <span className="text-muted-foreground">Tech Base</span>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Tech</SelectItem>
              {TECH_BASES.map(tb => (
                <SelectItem key={tb} value={tb}>{tb.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.role} onValueChange={v => handleFilterChange('role', v)}>
            <SelectTrigger className="w-auto">
              {filters.role || <span className="text-muted-foreground">Role</span>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Role</SelectItem>
              {ROLES.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {totalCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {totalCount} results{results.length < totalCount ? `, showing ${results.length}` : ''}
          </p>
        )}

        <div className="overflow-auto flex-1 min-h-0">
          {loading && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Loading...</p>
          )}

          {results.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right w-16">Tons</TableHead>
                  <TableHead className="text-right w-20">BV</TableHead>
                  <TableHead className="w-28">Role</TableHead>
                  <TableHead className="w-28">Tech</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(unit => {
                  let wc: string
                  try { wc = weightClassFromTonnage(unit.tonnage) } catch { wc = 'MEDIUM' }
                  const justAdded = addedSlug === unit.slug

                  return (
                    <TableRow key={unit.slug} className={justAdded ? 'bg-green-500/10' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-1 h-6 rounded-full shrink-0 ${WEIGHT_CLASS_BAR[wc] ?? ''}`} />
                          {unit.fullName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{Math.floor(unit.tonnage)}</TableCell>
                      <TableCell className="text-right font-mono">{unit.bv}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${WEIGHT_CLASS_COLORS[wc] ?? ''}`}>
                          {unit.role ?? '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{unit.techBase.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={justAdded ? 'default' : 'outline'}
                          className="h-7 text-xs"
                          onClick={() => addUnit(unit)}
                        >
                          {justAdded ? 'Added!' : 'Add'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {!loading && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No mechs found.</p>
          )}

          {hasMore && <div ref={sentinelRef} className="h-8 flex items-center justify-center">
            {loading && <p className="text-xs text-muted-foreground animate-pulse">Loading more...</p>}
          </div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
