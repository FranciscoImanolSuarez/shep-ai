export default function DashboardLoading() {
  return (
    <div className="flex-1 overflow-auto">
      {/* Hero skeleton */}
      <div className="border-b border-border px-6 py-10 sm:px-8 sm:py-16">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-72 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
            <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
          </div>
          {/* Stats row in hero */}
          <div className="flex gap-8 pt-6 border-t border-border mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
                <div className="h-6 w-10 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* StatCard grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>

          {/* Section divider */}
          <div className="h-px bg-muted animate-pulse rounded" />

          {/* Principles grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-2.5 w-12 bg-muted animate-pulse rounded" />
                <div className="h-5 w-40 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Recent activity bento */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-64 bg-muted animate-pulse rounded-xl" />
            <div className="lg:col-span-2 h-64 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
