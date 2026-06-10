'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronDownIcon, ChevronUpIcon, ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import type { PublishedAgent } from '@/core/domain/entities/published-agent'
import { Button } from '@/components/ui/button'

export default function MarketplaceDetailPage() {
  const params = useParams()
  const router = useRouter()
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
      <div className="flex-1 px-6 py-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Agent not found.</p>
        <Link href="/marketplace" className="text-xs text-primary hover:underline">Back to marketplace</Link>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto px-6 py-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-3.5" strokeWidth={1.5} />
        Marketplace
      </Link>

      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-lg font-semibold">{agent.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Published by <span className="font-medium">{agent.publisherId}</span>
            {' · '}v{agent.version}
            {' · '}
            <span className="capitalize">{agent.category}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {installed ? (
            <span className="text-xs px-3 py-1.5 rounded bg-muted text-muted-foreground font-medium">Installed</span>
          ) : (
            <Button size="sm" onClick={handleInstall} disabled={installing}>
              {installing ? 'Installing…' : 'Install'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
        <span>{agent.installCount} installs</span>
        {agent.averageRating > 0 && (
          <span className="flex items-center gap-0.5">
            <span className="text-yellow-500">★</span>
            {agent.averageRating.toFixed(1)}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive mb-4">{error}</p>
      )}

      {/* Description */}
      {agent.description && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Description</h2>
          <p className="text-sm">{agent.description}</p>
        </div>
      )}

      {/* Tags */}
      {agent.tags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tags</h2>
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
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tools</h2>
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
      <div className="mb-6">
        <h2 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Config</h2>
        <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-lg p-3">
          <p>Model: <span className="text-foreground font-medium">{agent.configSnapshot.model}</span></p>
          <p>Provider: <span className="text-foreground">{agent.configSnapshot.provider}</span></p>
          <p>Temperature: <span className="text-foreground">{agent.configSnapshot.temperature}</span></p>
          <p>Max steps: <span className="text-foreground">{agent.configSnapshot.maxSteps}</span></p>
        </div>
      </div>

      {/* System prompt (collapsible) */}
      {agent.systemPromptSnapshot && (
        <div className="mb-6">
          <button
            onClick={() => setPromptOpen(!promptOpen)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors mb-2"
          >
            System Prompt
            {promptOpen ? (
              <ChevronUpIcon className="size-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronDownIcon className="size-3.5" strokeWidth={1.5} />
            )}
          </button>
          {promptOpen && (
            <pre className="text-xs bg-muted/30 rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-auto">
              {agent.systemPromptSnapshot}
            </pre>
          )}
        </div>
      )}

      {/* Rate */}
      <div className="border-t border-border pt-6">
        <h2 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Rate this agent</h2>
        {ratingDone ? (
          <p className="text-xs text-muted-foreground">Thanks for rating!</p>
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
    </div>
  )
}
