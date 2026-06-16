/**
 * Format a duration in milliseconds to a human-readable string.
 * < 1000 ms → "Xms"
 * >= 1000 ms → "X.XXs"
 * undefined  → "—"
 */
export function formatDurationMs(ms?: number): string {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format a USD cost string (as stored in the DB, e.g. "0.00042") to a
 * human-readable dollar amount.
 * 0      → "$0.00"
 * < 0.01 → "$0.0000" (4 decimal places)
 * else   → "$0.00"   (2 decimal places)
 */
export function formatCost(usd: string): string {
  const num = parseFloat(usd)
  if (num === 0) return '$0.00'
  if (num < 0.01) return `$${num.toFixed(4)}`
  return `$${num.toFixed(2)}`
}
