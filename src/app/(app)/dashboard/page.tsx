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
} from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { BarChart } from '@/components/shared/Sparkline'
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
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // Activity breakdown (top 4 event types)
  const breakdown = Object.entries(data.activityByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const breakdownTotal = breakdown.reduce((a, [, v]) => a + v, 0)
  const BREAKDOWN_COLORS = [
    'bg-primary',
    'oklch(0.65 0.18 145)', // green
    'oklch(0.7 0.18 50)',   // orange
    'oklch(0.55 0.22 290)', // violet
  ]

  return (
    <div>
      {/* HERO — Cohere editorial */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-amber-500/10 blur-3xl" />
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative px-6 sm:px-10 pt-16 pb-20 max-w-7xl mx-auto">
          {/* Date + status row */}
          <div className="flex items-center gap-3 mb-10 flex-wrap">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {dateLabel}
            </span>
            <span className="size-0.5 rounded-full bg-muted-foreground" />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
          </div>

          {/* Big editorial headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02] max-w-5xl">
            {greeting},{' '}
            <span className="text-primary">{firstName}</span>.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Your AI workspace. Build agents, compose workflows, ship faster. Every primitive you need, none you don&apos;t.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 mt-10 flex-wrap">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-md bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors shadow-sm"
            >
              <PlusIcon className="size-4" />
              Start a chat
            </Link>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Build an agent
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          {/* Big featured stat — Cohere bento style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border mt-16 rounded-2xl overflow-hidden border border-border">
            <div className="bg-background px-6 py-5">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Conversations
              </p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {data.totalConvs.toLocaleString()}
              </p>
            </div>
            <div className="bg-background px-6 py-5">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Agents
              </p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {data.agentCount}
              </p>
            </div>
            <div className="bg-background px-6 py-5">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Workflows
              </p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {data.workflowCount}
              </p>
            </div>
            <div className="bg-background px-6 py-5">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Documents
              </p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {data.docCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding banner — only when new */}
      {isNew && (
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="px-6 sm:px-10 py-10 max-w-7xl mx-auto">
            <div className="flex items-start gap-5 flex-wrap">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <SparklesIcon className="size-6" />
              </div>
              <div className="flex-1 min-w-[240px]">
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                  Welcome
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Let&apos;s build your first agent.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Agents are AI assistants with their own model, tools, and knowledge base. Build one in under a minute and we&apos;ll wire it into chat for you.
                </p>
              </div>
              <Link
                href="/agents"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors shadow-sm"
              >
                Get started
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* PRINCIPLES — Cohere 3-column editorial */}
      <section className="px-6 sm:px-10 py-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Workspace
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
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
      </section>

      {/* ACTIVITY — full width band */}
      {hasActivity && (
        <section className="border-y border-border bg-muted/30">
          <div className="px-6 sm:px-10 py-16 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Big chart spans 2 cols */}
              <div className="lg:col-span-2">
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                  Last 30 days · activity
                </p>
                <h2 className="text-4xl font-semibold tabular-nums tracking-tight">
                  {data.totalEvents.toLocaleString()}{' '}
                  <span className="text-base font-normal text-muted-foreground">events</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Daily activity across chat, agent runs, RAG queries, and workflow executions.
                </p>
                <div className="mt-8 rounded-2xl border border-border bg-background p-6">
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

              {/* Breakdown donut/bars sidebar */}
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                  Breakdown · by type
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Where it&apos;s spent
                </h3>
                <div className="mt-8 rounded-2xl border border-border bg-background p-6 space-y-4">
                  {breakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Not enough events to break down yet.
                    </p>
                  ) : breakdown.map(([type, count], i) => {
                    const pct = breakdownTotal > 0 ? (count / breakdownTotal) * 100 : 0
                    const colorStyle = i === 0
                      ? undefined
                      : { background: BREAKDOWN_COLORS[i] }
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
                            style={{ width: `${pct}%`, ...colorStyle }}
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
          </div>
        </section>
      )}

      {/* EDITORIAL QUOTE — Cohere signature */}
      <section className="px-6 sm:px-10 py-16 max-w-4xl mx-auto">
        <blockquote className="text-center">
          <p className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            &quot;Build agents that{' '}
            <span className="text-primary">ship</span>.
            Observe what they do. Iterate fast.&quot;
          </p>
          <footer className="mt-6 flex items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground">
            <span className="uppercase tracking-widest">shep-ai</span>
            <span className="size-0.5 rounded-full bg-muted-foreground" />
            <span>Working principles</span>
          </footer>
        </blockquote>
      </section>

      {/* RECENT ACTIVITY — asymmetric bento */}
      <section className="px-6 sm:px-10 pb-20 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Recent activity
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent traces — wide */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Observability</p>
                <h2 className="text-lg font-semibold tracking-tight mt-1">Recent traces</h2>
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
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Chat</p>
                <h2 className="text-lg font-semibold tracking-tight mt-1">Conversations</h2>
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
      </section>

      {/* CLOSING BAND */}
      <section className="relative overflow-hidden border-t border-border bg-gradient-to-br from-primary/5 via-background to-background">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-6 sm:px-10 py-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link
              href="/marketplace"
              className="group block"
            >
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Explore
              </p>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
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
            <Link
              href="/knowledge-bases"
              className="group block"
            >
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Connect
              </p>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
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
            <Link
              href="/design"
              className="group block"
            >
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Design
              </p>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
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
        </div>
      </section>

    </div>
  )
}
