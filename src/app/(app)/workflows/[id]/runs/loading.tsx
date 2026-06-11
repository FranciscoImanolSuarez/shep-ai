export default function WorkflowRunsLoading() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          <div className="h-8 w-56 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="h-10 bg-muted animate-pulse rounded-xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
