export async function register() {
  // Only start the dev poller in the Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV !== 'production') {
    const { startDevPoller } = await import('@/lib/dev-poller')
    startDevPoller()
  }
}
