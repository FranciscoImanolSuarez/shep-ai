'use client'

import dynamic from 'next/dynamic'

// `ssr: false` dynamic imports are only allowed inside Client Components.
// This thin client wrapper lets the (server) app layout lazy-load the
// command palette without pulling its dialog deps into every page's bundle.
const CommandPalette = dynamic(
  () => import('@/components/shared/CommandPalette').then((m) => m.CommandPalette),
  { ssr: false },
)

export function CommandPaletteLazy() {
  return <CommandPalette />
}
