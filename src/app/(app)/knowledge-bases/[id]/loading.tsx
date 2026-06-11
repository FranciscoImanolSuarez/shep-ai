export default function KnowledgeBaseDetailLoading() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          {/* Upload area */}
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          {/* Doc list */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
