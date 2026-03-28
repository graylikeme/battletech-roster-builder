import { useReferenceData } from '@/hooks/useReferenceData'
import { useFormState } from '@/hooks/useFormState'
import { useRosterGenerator } from '@/hooks/useRosterGenerator'
import { RosterForm } from '@/components/RosterForm'
import { RosterVariants } from '@/components/RosterVariants'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { ErrorBanner } from '@/components/ErrorBanner'

export function App() {
  const { eras, factions, factionsByType, loading: refLoading, error: refError } = useReferenceData()
  const { form, setField, isValid } = useFormState()
  const { status, progress, rosters, error, generate } = useRosterGenerator()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">BattleTech Roster Builder</h1>
        <p className="text-sm text-muted-foreground">Mission-driven roster generation for BattleTech Classic</p>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Left: Form */}
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
                status={status}
                onGenerate={() => generate(form)}
              />
            </div>
          </div>

          {/* Right: Results */}
          <div>
            {(status === 'fetching' || status === 'generating') && (
              <LoadingOverlay status={status} progress={progress} />
            )}

            {status === 'error' && error && (
              <ErrorBanner message={error} />
            )}

            {status === 'done' && rosters.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <RosterVariants rosters={rosters} />
              </div>
            )}

            {status === 'idle' && (
              <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                <p className="text-lg">Select a mission and parameters, then generate your roster.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
