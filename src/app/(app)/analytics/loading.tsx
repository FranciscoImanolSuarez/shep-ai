export default function AnalyticsLoading() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-10 sm:px-8 sm:py-16">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Period tabs skeleton */}
          <div className="flex gap-2 border-b border-border pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          {/* Chart containers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-48 bg-muted animate-pulse rounded-xl" />
            <div className="h-48 bg-muted animate-pulse rounded-xl" />
          </div>
          {/* List containers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
