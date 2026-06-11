export default function WorkspacesLoading() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-80 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
