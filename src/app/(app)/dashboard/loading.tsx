export default function DashboardLoading() {
  return (
    <div className="flex-1 overflow-auto animate-pulse">
      {/* PageHeader skeleton */}
      <div className="border-b border-border px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-64 bg-muted rounded-md mb-2" />
          <div className="h-4 w-52 bg-muted rounded-md" />
        </div>
      </div>

      {/* PageBody skeleton */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-border p-5">
                <div className="h-3 w-20 bg-muted rounded mb-3" />
                <div className="h-7 w-14 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Recent conversations skeleton */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    i < 3 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-4 bg-muted rounded" />
                    <div className="h-4 w-48 bg-muted rounded" />
                  </div>
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
