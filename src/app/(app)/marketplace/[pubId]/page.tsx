'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDownIcon, ChevronUpIcon, ArrowLeftIcon, DownloadIcon, StarIcon, TagIcon, WrenchIcon, SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import type { PublishedAgent } from '@/core/domain/entities/published-agent'
import { Button } from '@/components/ui/button'
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { EmptyState } from '@/components/shared/EmptyState'
import { Alert } from '@/components/shared/Alert'

export default function MarketplaceDetailPage() {
  const params = useParams()
  const pubId = params.pubId as string

  const [agent, setAgent] = useState<PublishedAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [promptOpen, setPromptOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/marketplace/${pubId}`)
      .then((r) => r.json())
      .then((d) => setAgent(d.agent ?? null))
      .finally(() => setLoading(false))
  }, [pubId])

  async function handleInstall() {
    setInstalling(true)
    setError('')
    try {
      const res = await fetch(`/api/marketplace/${pubId}/install`, { method: 'POST' })
      if (res.status === 409) {
        setInstalled(true)
        return
      }
      if (res.ok) {
        setInstalled(true)
        setAgent((prev) => prev ? { ...prev, installCount: prev.installCount + 1 } : prev)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Install failed')
      }
    } finally {
      setInstalling(false)
    }
  }

  async function handleRate(stars: number) {
    setRating(stars)
    setRatingSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/marketplace/${pubId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars }),
      })
      if (res.status === 409) {
        setRatingDone(true)
        return
      }
      if (res.ok) {
        setRatingDone(true)
        // Refresh average
        const detailRes = await fetch(`/api/marketplace/${pubId}`)
        if (detailRes.ok) {
          const data = await detailRes.json()
          setAgent(data.agent ?? null)
        }
      } else {
        const data = await res.json()
        setError(data.error ?? 'Rating failed')
      }
    } finally {
      setRatingSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex-1 overflow-auto">
        <PageBody className="pt-12">
          <EmptyState
            icon={ArrowLeftIcon}
            title="Agent not found"
            description="This agent may have been removed or the link is invalid."
            action={
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                <ArrowLeftIcon className="size-3.5" />
                Back to marketplace
              </Link>
            }
          />
        </PageBody>
      </div>
    )
  }

  const backLink = (
    <Link
      href="/marketplace"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeftIcon className="size-3.5" strokeWidth={1.5} />
      Marketplace
    </Link>
  )

  const installAction = installed ? (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-muted text-muted-foreground text-sm font-medium">
      Installed
    </span>
  ) : (
    <Button size="sm" onClick={handleInstall} disabled={installing}>
      {installing ? 'Installing…' : 'Install'}
    </Button>
  )

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="MARKETPLACE"
        title={agent.name}
        description={
          agent.description
            ? `${agent.description} — Published by ${agent.publisherId} · v${agent.version} · ${agent.category.charAt(0).toUpperCase() + agent.category.slice(1)}`
            : `Published by ${agent.publisherId} · v${agent.version} · ${agent.category.charAt(0).toUpperCase() + agent.category.slice(1)}`
        }
        variant="default"
        actions={
          <div className="flex items-center gap-2">
            {backLink}
            {installAction}
          </div>
        }
      />

      <PageBody className="space-y-6">
        {error && (
          <Alert variant="danger" description={error} onDismiss={() => setError('')} />
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Installs" value={agent.installCount} icon={DownloadIcon} />
          <StatCard
            label="Rating"
            value={agent.averageRating > 0 ? `${agent.averageRating.toFixed(1)} / 5` : '—'}
            icon={StarIcon}
          />
          <StatCard label="Version" value={`v${agent.version}`} icon={TagIcon} />
          <StatCard
            label="Updated"
            value={new Date(agent.updatedAt).toLocaleDateString()}
            icon={SettingsIcon}
          />
        </div>

        {/* Description */}
        {agent.description && (
          <div className="rounded-xl border border-border p-5">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Description</p>
            <p className="text-sm leading-relaxed">{agent.description}</p>
          </div>
        )}

        {/* Tags */}
        {agent.tags.length > 0 && (
          <div className="rounded-xl border border-border p-5">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Tags</p>
            <div className="flex flex-wrap gap-1">
              {agent.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {agent.toolIdsSnapshot.length > 0 && (
          <div className="rounded-xl border border-border p-5">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              <WrenchIcon className="size-3 inline mr-1" />
              Tools
            </p>
            <div className="flex flex-wrap gap-1">
              {agent.toolIdsSnapshot.map((tool) => (
                <span key={tool} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Config snapshot */}
        <div className="rounded-xl border border-border p-5">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Config</p>
          <div className="text-xs text-muted-foreground space-y-1 grid grid-cols-2 gap-2">
            <p>Model: <span className="text-foreground font-medium">{agent.configSnapshot.model}</span></p>
            <p>Provider: <span className="text-foreground">{agent.configSnapshot.provider}</span></p>
            <p>Temperature: <span className="text-foreground">{agent.configSnapshot.temperature}</span></p>
            <p>Max steps: <span className="text-foreground">{agent.configSnapshot.maxSteps}</span></p>
          </div>
        </div>

        {/* System prompt (collapsible) */}
        {agent.systemPromptSnapshot && (
          <div className="rounded-xl border border-border p-5">
            <button
              onClick={() => setPromptOpen(!promptOpen)}
              className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors mb-2 w-full text-left"
            >
              System Prompt
              {promptOpen ? (
                <ChevronUpIcon className="size-3.5 ml-auto" strokeWidth={1.5} />
              ) : (
                <ChevronDownIcon className="size-3.5 ml-auto" strokeWidth={1.5} />
              )}
            </button>
            {promptOpen && (
              <pre className="text-xs bg-muted/30 rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-auto mt-2">
                {agent.systemPromptSnapshot}
              </pre>
            )}
          </div>
        )}

        {/* Rate this agent */}
        <SectionDivider label="Rate this agent" align="left" />
        <div className="rounded-xl border border-border p-5">
          {ratingDone ? (
            <p className="text-sm text-muted-foreground">Thanks for rating!</p>
          ) : (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  disabled={ratingSubmitting}
                  className={`text-xl transition-colors hover:text-yellow-500 ${
                    star <= rating ? 'text-yellow-500' : 'text-muted-foreground'
                  } disabled:opacity-40`}
                >
                  ★
                </button>
              ))}
              {ratingSubmitting && <span className="text-xs text-muted-foreground ml-2">Saving…</span>}
            </div>
          )}
        </div>
      </PageBody>
    </div>
  )
}
