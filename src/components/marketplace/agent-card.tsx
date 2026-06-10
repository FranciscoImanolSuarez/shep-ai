'use client'

import type { PublishedAgent, AgentInstall } from '@/core/domain/entities/published-agent'

interface AgentCardProps {
  agent: PublishedAgent
  install?: AgentInstall | null
  onInstall?: (pubId: string) => Promise<void>
  installing?: boolean
}

export function AgentCard({ agent, install, onInstall, installing }: AgentCardProps) {
  const hasUpdate = install && install.installedVersion < install.latestVersion

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold tracking-tight truncate">{agent.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            v{agent.version}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 capitalize">
          {agent.category}
        </span>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
      )}

      {/* Tags */}
      {agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{agent.installCount} installs</span>
          {agent.averageRating > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="text-yellow-500">★</span>
              {agent.averageRating.toFixed(1)}
            </span>
          )}
        </div>

        <div>
          {install ? (
            hasUpdate ? (
              <span className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                Update available
              </span>
            ) : (
              <span className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground font-medium">
                Installed
              </span>
            )
          ) : (
            <button
              onClick={() => onInstall?.(agent.id)}
              disabled={installing}
              className="text-[10px] px-2.5 py-1 rounded bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
