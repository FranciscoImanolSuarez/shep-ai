import { Spinner } from '@/components/shared/Spinner'

export default function WorkflowEditLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background shrink-0">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-px bg-border" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <Spinner size="lg" />
      </div>
    </div>
  )
}
