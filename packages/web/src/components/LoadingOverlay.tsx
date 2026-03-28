import type { FetchProgress } from '@bt-roster/core'

interface LoadingOverlayProps {
  status: 'fetching' | 'generating'
  progress: FetchProgress | null
}

export function LoadingOverlay({ status, progress }: LoadingOverlayProps) {
  const label = status === 'fetching'
    ? progress
      ? `Fetching units... page ${progress.page} (${progress.fetched}/${progress.total})`
      : 'Fetching units...'
    : 'Generating roster...'

  const pct = status === 'fetching' && progress && typeof progress.total === 'number' && progress.total > 0
    ? Math.round(progress.fetched / progress.total * 100)
    : null

  return (
    <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-4">
      <div className="animate-pulse text-muted-foreground text-sm">{label}</div>
      {pct !== null && (
        <div className="w-full max-w-xs bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
