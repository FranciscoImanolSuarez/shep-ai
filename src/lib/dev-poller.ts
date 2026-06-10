// Dev-only poller that replicates the Vercel Cron behaviour locally.
// Only active when NODE_ENV !== 'production' and NEXT_RUNTIME === 'nodejs'.
// Calls the same handler as GET /api/cron/scheduled-agents every 60 seconds.

export function startDevPoller() {
  if (process.env.NODE_ENV === 'production') return
  if (typeof setInterval === 'undefined') return

  const tick = async () => {
    try {
      const { getContainer } = await import('@/config/container')
      const { scheduledAgentUseCase } = getContainer()
      const result = await scheduledAgentUseCase.runDueSchedules()
      if (result.ran > 0 || result.errors > 0) {
        console.log(`[dev-poller] scheduled-agents tick: ran=${result.ran} errors=${result.errors}`)
      }
    } catch (err) {
      console.error('[dev-poller] scheduled-agents tick failed:', err)
    }
  }

  setInterval(tick, 60_000)
}
