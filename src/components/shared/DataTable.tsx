import type { ReactNode } from 'react'

interface DataTableProps {
  headers: string[]
  loading?: boolean
  empty?: ReactNode
  children?: ReactNode
  loadingRows?: number
}

export function DataTable({ headers, loading, empty, children, loadingRows = 5 }: DataTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border overflow-hidden animate-pulse" aria-busy="true">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {headers.map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h} className="px-4 py-3">
                    <div className="h-3 w-20 rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (empty) return <>{empty}</>

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}
