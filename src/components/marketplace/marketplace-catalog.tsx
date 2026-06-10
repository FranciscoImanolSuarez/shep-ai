'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import type { PublishedAgent } from '@/core/domain/entities/published-agent'
import { AGENT_CATEGORIES } from '@/core/domain/entities/published-agent'
import { AgentCard } from './agent-card'
import { Input } from '@/components/ui/input'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { Banner } from '@/components/shared/Banner'
import { EmptyState } from '@/components/shared/EmptyState'
import { StoreIcon } from 'lucide-react'
import { toast } from '@/components/shared/Toast'

interface MarketplaceCatalogProps {
  initialAgents: PublishedAgent[]
}

export function MarketplaceCatalog({ initialAgents }: MarketplaceCatalogProps) {
  const [agents, setAgents] = useState<PublishedAgent[]>(initialAgents)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string>('')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const search = useCallback(
    (newQ: string, newCategory: string) => {
      const params = new URLSearchParams()
      if (newQ) params.set('q', newQ)
      if (newCategory && newCategory !== 'all') params.set('category', newCategory)

      startTransition(async () => {
        const res = await fetch(`/api/marketplace?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setAgents(data.agents ?? [])
        }
      })
    },
    [],
  )

  function handleQChange(value: string) {
    setQ(value)
    search(value, category)
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    search(q, value)
  }

  async function handleInstall(pubId: string) {
    setInstallingId(pubId)
    try {
      const res = await fetch(`/api/marketplace/${pubId}/install`, { method: 'POST' })
      if (res.ok) {
        // Refresh agent to show installed state
        setAgents((prev) =>
          prev.map((a) => (a.id === pubId ? { ...a, installCount: a.installCount + 1 } : a)),
        )
        toast.success('Agent installed')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Install failed')
      }
    } finally {
      setInstallingId(null)
    }
  }

  const searchActions = (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search agents..."
        value={q}
        onChange={(e) => handleQChange(e.target.value)}
        className="w-56"
      />
      <Link
        href="/marketplace/mine"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        My published
      </Link>
    </div>
  )

  const categoryChips = (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {(['', ...AGENT_CATEGORIES] as const).map((cat) => (
        <button
          key={cat || 'all'}
          onClick={() => handleCategoryChange(cat)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            (category || '') === cat
              ? 'bg-foreground text-background border-transparent'
              : 'border-border text-muted-foreground hover:border-foreground/40'
          }`}
        >
          {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <Hero
        eyebrow="MARKETPLACE"
        title="Discover agents"
        accent="Discover"
        description="Install agents built and shared by the community. Publish your own to reach more users."
        variant="both"
        actions={searchActions}
      />

      <PageBody className="space-y-4">
        <Banner
          variant="feature"
          title="Build &amp; share"
          description="Publish your agents to reach the community. They stay yours — others install copies."
          action={
            <Link
              href="/marketplace/mine"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-accent transition-colors"
            >
              My published
            </Link>
          }
        />
        {categoryChips}
        {isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title="No agents match your filters"
            description="Try adjusting your search or category filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/marketplace/${agent.id}`}>
                <AgentCard
                  agent={agent}
                  install={null}
                  onInstall={async (pubId) => {
                    // Prevent navigation
                    await handleInstall(pubId)
                  }}
                  installing={installingId === agent.id}
                />
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
