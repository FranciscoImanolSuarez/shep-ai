import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { relativeTime } from '@/lib/relative-time'
import {
  PlusIcon,
  MessageSquareIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ActivityIcon,
  SparklesIcon,
  MessageSquareTextIcon,
  BotIcon,
  GitBranchIcon,
  BookOpenIcon,
} from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { BarChart } from '@/components/shared/Sparkline'
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { SectionDivider } from '@/components/shared/SectionDivider'
import type { Trace, TraceStatus } from '@/core/domain/entities/trace'

async function getDashboardData(userId: string) {
  const ctx = await getActiveWorkspaceContext()
  const {
    conversationUseCase,
    agentUseCase,
    knowledgeBaseUseCase,
    knowledgeBaseStore,
    workflowUseCase,
    auditStore,
    observabilityUseCase,
  } = getContainer()

  const now = new Date()
  const from30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [conversationsAll, totalConvs, agents, kbs] = await Promise.all([
    conversationUseCase.listConversations(userId),
    conversationUseCase.countConversations(userId),
    agentUseCase.listAgents().catch(() => []),
    knowledgeBaseUseCase.list(userId).catch(() => []),
  ])

  let docCount = 0
  try {
    const docCounts = await Promise.all(
      kbs.map((kb) =>
        knowledgeBaseStore.listDocumentsByKb(kb.id).then((docs) => docs.length).catch(() => 0),
      ),
    )
    docCount = docCounts.reduce((a, b) => a + b, 0)
  } catch { /* non-fatal */ }

  let workflowCount = 0
  if (ctx) {
    try {
      const wfs = await workflowUseCase.listWorkflows(ctx.workspace.id)
      workflowCount = wfs.length
    } catch { /* non-fatal */ }
  }

  let activityData: number[] = []
  let totalEvents = 0
  let activityByType: Record<string, number> = {}
  try {
    const aggregate = await auditStore.aggregate(userId, { from: from30d, to: now }, 'day')
    const bucketMap = new Map(aggregate.timeSeries.map((b) => [b.bucket.slice(0, 10), b.eventCount]))
    activityData = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(from30d.getTime() + i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      return bucketMap.get(key) ?? 0
    })
    totalEvents = activityData.reduce((a, b) => a + b, 0)
    activityByType = aggregate.summary?.eventCounts ?? {}
  } catch { /* non-fatal */ }

  let recentTraces: Trace[] = []
  if (ctx) {
    try {
      recentTraces = await observabilityUseCase.listTraces({
        workspaceId: ctx.workspace.id,
        limit: 5,
      })
    } catch { /* non-fatal */ }
  }

  return {
    totalConvs,
    recentConvs: conversationsAll.slice(0, 5),
    agents,
    agentCount: agents.length,
    docCount,
    kbsCount: kbs.length,
    workflowCount,
    activityData,
    totalEvents,
    activityByType,
    recentTraces,
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function TraceStatusBadge({ status }: { status: TraceStatus }) {
  const variantMap: Record<TraceStatus, 'warning' | 'success' | 'danger'> = {
    running: 'warning',
    ok: 'success',
    error: 'danger',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

interface PrincipleProps {
  label: string
  title: string
  body: string
  href: string
}

function Principle({ label, title, body, href }: PrincipleProps) {
  return (
    <Link
      href={href}
      className="group block border-l border-foreground/15 hover:border-primary pl-6 transition-colors"
    >
      <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">{label}</p>
      <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
      <span className="inline-flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors">
        Open
        <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </span>
    </Link>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.email!
  const firstName = session!.user!.name?.split(' ')[0] ?? 'there'
  const greeting = getGreeting()

  const data = await getDashboardData(userId)
  const hasActivity = data.totalEvents > 0
  const isNew = data.agentCount === 0 && data.totalConvs === 0

  // Activity breakdown (top 4 event types)
  const breakdown = Object.entries(data.activityByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const breakdownTotal = breakdown.reduce((a, [, v]) => a + v, 0)
  const BREAKDOWN_COLORS = [
    'bg-primary',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
  ]

  const ctaActions = (
    <div className="flex items-center gap-3 flex-wrap">
      <Link
        href="/chat"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium shadow-sm hover:bg-foreground/90 transition-colors"
      >
        <PlusIcon className="size-4" />
        Start a chat
      </Link>
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
      >
        Build an agent
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  )

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="DASHBOARD"
        title={`${greeting}, ${firstName}.`}
        accent={firstName}
        description="Your AI workspace. Build agents, compose workflows, ship faster. Every primitive you need, none you don't."
        variant="both"
        actions={ctaActions}
        stats={[
          { label: 'Conversations', value: data.totalConvs.toLocaleString() },
          { label: 'Agents', value: data.agentCount },
          { label: 'Workflows', value: data.workflowCount },
          { label: 'Documents', value: data.docCount.toLocaleString() },
        ]}
      />

      <PageBody className="space-y-6">
        {/* Stat cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Conversations" value={data.totalConvs.toLocaleString()} icon={MessageSquareTextIcon} />
          <StatCard label="Agents" value={data.agentCount} icon={BotIcon} />
          <StatCard label="Workflows" value={data.workflowCount} icon={GitBranchIcon} />
          <StatCard label="Documents" value={data.docCount.toLocaleString()} icon={BookOpenIcon} />
        </div>

        {/* Onboarding banner — only when new */}
        {isNew && (
          <div className="border border-border rounded-xl bg-gradient-to-br from-primary/5 via-background to-background p-6 flex items-start gap-5 flex-wrap hover:border-foreground/20 transition-colors">
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <SparklesIcon className="size-6" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Welcome
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                Let&apos;s build your first agent.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
                Agents are AI assistants with their own model, tools, and knowledge base. Build one in under a minute and we&apos;ll wire it into chat for you.
              </p>
            </div>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors shadow-sm"
            >
              Get started
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        )}

        <SectionDivider label="Workspace" align="left" />

        {/* Principles — 3-column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Principle
            label="Build"
            title="Compose AI agents"
            body="Design agents with their own prompts, tools and knowledge. Mix providers freely — switch models, mid-conversation, anytime."
            href="/agents"
          />
          <Principle
            label="Automate"
            title="Wire visual flows"
            body="Connect agents with branching logic, conditions, and inputs. From a quick automation to a multi-step orchestration."
            href="/workflows"
          />
          <Principle
            label="Observe"
            title="Trace every step"
            body="Span-level observability for every agent and workflow run. Tokens, cost, errors — debuggable end to end."
            href="/observability"
          />
        </div>

        {/* Activity section */}
        {hasActivity && (
          <>
            <SectionDivider label="Last 30 days · activity" align="left" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Big chart spans 2 cols */}
              <div className="lg:col-span-2">
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {data.totalEvents.toLocaleString()}
                  </p>
                  <span className="text-sm text-muted-foreground">events</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Daily activity across chat, agent runs, RAG queries, and workflow executions.
                </p>
                <div className="rounded-xl border border-border bg-background p-6 hover:border-foreground/20 transition-colors">
                  <BarChart data={data.activityData} height={120} />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                      30 days ago
                    </span>
                    <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                      Today
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown sidebar */}
              <div>
                <p className="text-lg font-semibold tracking-tight mb-6">
                  Where it&apos;s spent
                </p>
                <div className="rounded-xl border border-border bg-background p-6 space-y-4 hover:border-foreground/20 transition-colors">
                  {breakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Not enough events to break down yet.
                    </p>
                  ) : breakdown.map(([type, count], i) => {
                    const pct = breakdownTotal > 0 ? (count / breakdownTotal) * 100 : 0
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium truncate">{type}</span>
                          <span className="font-mono text-muted-foreground tabular-nums">
                            {count.toLocaleString()}{' '}
                            <span className="opacity-60">· {pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={i === 0 ? 'h-full bg-primary' : 'h-full'}
                            style={{
                              width: `${pct}%`,
                              ...(i > 0 ? { background: BREAKDOWN_COLORS[i] } : {}),
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Link
                  href="/analytics"
                  className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  See full analytics
                  <ArrowUpRightIcon className="size-3" />
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Editorial quote */}
        <div className="py-8">
          <blockquote className="text-center">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              &quot;Build agents that{' '}
              <span className="text-primary">ship</span>.
              Observe what they do. Iterate fast.&quot;
            </p>
            <footer className="mt-5 flex items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="uppercase tracking-widest">shep-ai</span>
              <span className="size-0.5 rounded-full bg-muted-foreground" />
              <span>Working principles</span>
            </footer>
          </blockquote>
        </div>

        <SectionDivider label="Recent activity" align="left" />

        {/* Recent activity bento */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent traces — wide */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Observability</p>
                <h2 className="text-base font-semibold tracking-tight mt-1">Recent traces</h2>
              </div>
              <Link
                href="/observability"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
                <ArrowUpRightIcon className="size-3" />
              </Link>
            </div>
            {data.recentTraces.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <ActivityIcon className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No traces yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Run an agent to populate observability data.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentTraces.map((trace) => (
                  <Link
                    key={trace.id}
                    href={`/observability/${trace.id}`}
                    className="flex items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors group"
                  >
                    <code className="text-xs text-muted-foreground font-mono shrink-0">
                      {trace.id.slice(-8)}
                    </code>
                    <Badge variant={trace.rootKind === 'agent' ? 'info' : 'warning'}>
                      {trace.rootKind}
                    </Badge>
                    <TraceStatusBadge status={trace.status} />
                    <span className="text-xs text-muted-foreground ml-auto shrink-0 font-mono">
                      {formatDuration(trace.durationMs)} · {relativeTime(trace.startedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent conversations — narrow */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Chat</p>
                <h2 className="text-base font-semibold tracking-tight mt-1">Conversations</h2>
              </div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
                <ArrowUpRightIcon className="size-3" />
              </Link>
            </div>
            {data.recentConvs.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <MessageSquareIcon className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                >
                  Start one →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentConvs.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className="block px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">
                      {conv.title || 'New conversation'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {relativeTime(conv.updatedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <SectionDivider label="Discover" align="left" />

        {/* Closing links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6">
          <Link href="/marketplace" className="group block">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              Explore
            </p>
            <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
              Browse marketplace
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Install agents built and shared by the community. Save time, learn patterns.
            </p>
            <span className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              Discover
              <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </Link>
          <Link href="/knowledge-bases" className="group block">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              Connect
            </p>
            <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
              Add knowledge
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Upload documents to a knowledge base so your agents can answer from your sources.
            </p>
            <span className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              {data.kbsCount > 0 ? `${data.kbsCount} knowledge base${data.kbsCount !== 1 ? 's' : ''}` : 'Create one'}
              <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </Link>
          <Link href="/design" className="group block">
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              Design
            </p>
            <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
              Design system
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Every primitive, token and pattern. Built on OKLCH, Tailwind v4, and React 19.
            </p>
            <span className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              Open
              <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </Link>
        </div>
      </PageBody>
    </div>
  )
}
