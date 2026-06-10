'use client'

import { useState, useEffect } from 'react'
import {
  SunIcon,
  MoonIcon,
  MessageSquareIcon,
  AlertCircleIcon,
  InboxIcon,
  FileIcon,
  PencilIcon,
  CopyIcon,
  Trash2Icon,
  SearchIcon,
  ArrowRightIcon,
  LightbulbIcon,
  ActivityIcon,
  CheckCircleIcon,
  GitBranchIcon,
} from 'lucide-react'

import { Badge } from '@/components/shared/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { Sparkline, BarChart } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { WorkflowThumbnail } from '@/components/workflows/WorkflowThumbnail'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

// ─── Visual presence imports ──────────────────────────────────────────────────
import { Hero } from '@/components/shared/Hero'
import { Banner } from '@/components/shared/Banner'
import { FeatureGrid } from '@/components/shared/FeatureGrid'
import { SectionDivider } from '@/components/shared/SectionDivider'
import { SpotlightCard } from '@/components/shared/SpotlightCard'

// ─── New component imports ────────────────────────────────────────────────────
import { Alert } from '@/components/shared/Alert'
import { Spinner } from '@/components/shared/Spinner'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { JSONViewer } from '@/components/shared/JSONViewer'
import { KeyValueGrid } from '@/components/shared/KeyValueGrid'
import { Donut } from '@/components/shared/Donut'
import { Timeline } from '@/components/shared/Timeline'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { Tabs } from '@/components/shared/Tabs'
import { KeyboardShortcut } from '@/components/shared/KeyboardShortcut'
import { UsageQuota } from '@/components/shared/UsageQuota'
import { EmptyChart } from '@/components/shared/EmptyChart'
import { ModelBadge } from '@/components/ai/ModelBadge'
import { AgentAvatar } from '@/components/ai/AgentAvatar'
import { CodeBlock } from '@/components/ai/CodeBlock'
import { StreamingText } from '@/components/ai/StreamingText'
import { MessageBubble } from '@/components/ai/MessageBubble'
import { ToolCallCard } from '@/components/ai/ToolCallCard'
import { PromptInput } from '@/components/ai/PromptInput'
import { HeatMap } from '@/components/observability/HeatMap'
import { Combobox } from '@/components/shared/forms/Combobox'
import { DateRangePicker } from '@/components/shared/forms/DateRangePicker'
import { MultiSelect } from '@/components/shared/forms/MultiSelect'
import { CronInput } from '@/components/shared/forms/CronInput'
import { FileUpload } from '@/components/shared/forms/FileUpload'
import { toast } from '@/components/shared/Toast'

// ─── Static demo data (computed once at module load) ─────────────────────────

const HEATMAP_DEMO_DATA = Array.from({ length: 84 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (83 - i))
  return { date: d.toISOString().slice(0, 10), value: Math.floor(Math.random() * 20) }
})

// ─── Theme toggle ────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    return saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-6 z-50 p-2 rounded-md bg-card border border-border hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
    </button>
  )
}

// ─── Nav data ────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    category: 'Tokens',
    items: [
      { id: 'colors', label: 'Colors' },
      { id: 'typography', label: 'Typography' },
      { id: 'spacing', label: 'Spacing' },
      { id: 'radius', label: 'Radius' },
    ],
  },
  {
    category: 'Primitives',
    items: [
      { id: 'buttons', label: 'Buttons' },
      { id: 'badges', label: 'Badges' },
      { id: 'inputs', label: 'Inputs' },
      { id: 'selects', label: 'Selects' },
      { id: 'switches', label: 'Switches' },
      { id: 'dialog', label: 'Dialog' },
      { id: 'dropdown', label: 'Dropdown' },
      { id: 'charts', label: 'Charts' },
    ],
  },
  {
    category: 'Composed',
    items: [
      { id: 'statcard', label: 'StatCard' },
      { id: 'pageheader', label: 'PageHeader' },
      { id: 'emptystate', label: 'EmptyState' },
      { id: 'datatable', label: 'DataTable' },
      { id: 'cards', label: 'Cards' },
    ],
  },
  {
    category: 'Patterns',
    items: [
      { id: 'filterchips', label: 'Filter chips' },
      { id: 'statusindicators', label: 'Status indicators' },
      { id: 'skeletons', label: 'Skeletons' },
      { id: 'avatars', label: 'Avatar list' },
    ],
  },
  {
    category: 'Advanced primitives',
    items: [
      { id: 'adv-tier-a', label: 'Foundations' },
      { id: 'adv-tier-c', label: 'Observability' },
      { id: 'adv-tier-b', label: 'AI / Agent' },
      { id: 'adv-tier-d', label: 'Platform' },
      { id: 'adv-tier-e', label: 'Forms' },
      { id: 'adv-tier-f', label: 'Polish' },
    ],
  },
  {
    category: 'Visual presence',
    items: [
      { id: 'vp-hero', label: 'Hero' },
      { id: 'vp-banner', label: 'Banner' },
      { id: 'vp-featuregrid', label: 'FeatureGrid' },
      { id: 'vp-sectiondivider', label: 'SectionDivider' },
      { id: 'vp-spotlightcard', label: 'SpotlightCard' },
    ],
  },
]

// ─── Color tokens ────────────────────────────────────────────────────────────

const COLOR_TOKENS = [
  { var: '--background', value: 'oklch(1 0 0)', usage: 'Page background' },
  { var: '--foreground', value: 'oklch(0.145 0 0)', usage: 'Body text' },
  { var: '--primary', value: 'oklch(0.6 0.22 250)', usage: 'Brand actions, links' },
  { var: '--primary-foreground', value: 'oklch(0.985 0 0)', usage: 'Text on primary' },
  { var: '--muted', value: 'oklch(0.97 0 0)', usage: 'Subtle backgrounds' },
  { var: '--muted-foreground', value: 'oklch(0.556 0 0)', usage: 'Secondary text' },
  { var: '--border', value: 'oklch(0.922 0 0)', usage: 'Dividers, card edges' },
  { var: '--card', value: 'oklch(1 0 0)', usage: 'Card backgrounds' },
  { var: '--ring', value: 'oklch(0.6 0.22 250)', usage: 'Focus rings' },
  { var: '--destructive', value: 'oklch(0.577 0.245 27.325)', usage: 'Errors, deletes' },
  { var: '--chart-1', value: 'oklch(0.6 0.22 250)', usage: 'Chart series 1' },
  { var: '--chart-2', value: 'oklch(0.65 0.18 145)', usage: 'Chart series 2' },
  { var: '--chart-3', value: 'oklch(0.7 0.18 50)', usage: 'Chart series 3' },
  { var: '--chart-4', value: 'oklch(0.55 0.22 290)', usage: 'Chart series 4' },
  { var: '--chart-5', value: 'oklch(0.7 0.15 200)', usage: 'Chart series 5' },
  { var: '--sidebar', value: 'oklch(0.985 0 0)', usage: 'Sidebar background' },
  { var: '--sidebar-accent', value: 'oklch(0.97 0 0)', usage: 'Sidebar hover' },
  { var: '--sidebar-foreground', value: 'oklch(0.145 0 0)', usage: 'Sidebar text' },
]

// ─── Demo data ────────────────────────────────────────────────────────────────

const demoDefinition: WorkflowDefinition = {
  nodes: [
    { id: 'input', type: 'input', position: { x: 0, y: 50 }, config: {} },
    { id: 'agent', type: 'agent', position: { x: 100, y: 50 }, config: { agentId: 'demo' } },
    { id: 'condition', type: 'condition', position: { x: 200, y: 50 }, config: { expression: '{}' } },
    { id: 'output', type: 'output', position: { x: 300, y: 50 }, config: {} },
  ],
  edges: [
    { id: 'e1', source: 'input', target: 'agent' },
    { id: 'e2', source: 'agent', target: 'condition' },
    { id: 'e3', source: 'condition', target: 'output' },
  ],
}

const TABLE_ROWS = [
  { name: 'web-scraper-v2', status: 'ok', updated: '2m ago' },
  { name: 'summarizer', status: 'running', updated: 'just now' },
  { name: 'classifier', status: 'ok', updated: '1h ago' },
  { name: 'notifier', status: 'error', updated: '3h ago' },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  id,
  preheader,
  title,
  detail,
  description,
  children,
}: {
  id: string
  preheader: string
  title: string
  detail?: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5">
      <div className="space-y-2">
        <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {preheader}
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
          {detail && (
            <span className="text-xs font-mono text-muted-foreground">{detail}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">{children}</div>
    </section>
  )
}

// ─── Group banner ─────────────────────────────────────────────────────────────

function GroupBanner({
  chartVar,
  category,
  headline,
  body,
  meta,
}: {
  chartVar: string
  category: string
  headline: string
  body: string
  meta: string[]
}) {
  return (
    <section className="relative my-16 rounded-2xl border border-border overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, var(${chartVar}) 0%, transparent 70%)`,
          opacity: 0.08,
        }}
      />
      <div className="relative p-10">
        <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
          {category}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight max-w-2xl">{headline}</h2>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl leading-relaxed">{body}</p>
        <div className="flex flex-wrap items-center gap-3 mt-5 text-[11px] font-mono text-muted-foreground">
          {meta.map((item, i) => (
            <span key={i} className="flex items-center gap-3">
              {i > 0 && <span className="size-0.5 rounded-full bg-muted-foreground inline-block" />}
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Group divider ────────────────────────────────────────────────────────────

function GroupDivider({ label }: { label: string }) {
  return (
    <div className="my-20 flex items-center gap-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ─── Sticky section nav ───────────────────────────────────────────────────────

function SectionNav({ activeSection }: { activeSection: string }) {
  return (
    <aside className="sticky top-6 w-48 shrink-0 hidden lg:block self-start">
      <nav className="space-y-4">
        {NAV_SECTIONS.map((group) => (
          <div key={group.category} className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pb-1">
              {group.category}
            </p>
            {group.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block text-xs px-2 py-1 rounded-md transition-colors ${
                  activeSection === item.id
                    ? 'text-primary bg-primary/8 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignPage() {
  const [activeSection, setActiveSection] = useState('colors')
  const [filterActive, setFilterActive] = useState('All')
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [darkModeOn, setDarkModeOn] = useState(false)
  const [ragChecked, setRagChecked] = useState(true)
  const [streamChecked, setStreamChecked] = useState(false)
  const [logChecked, setLogChecked] = useState(false)

  // Advanced primitives state
  const [promptValue, setPromptValue] = useState('')
  const [comboValue, setComboValue] = useState('')
  const [multiValues, setMultiValues] = useState<string[]>(['react', 'typescript'])
  const [cronValue, setCronValue] = useState('0 9 * * 1-5')
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState({ from: '2026-05-01', to: '2026-05-30' })

  useEffect(() => {
    const sectionIds = NAV_SECTIONS.flatMap((g) => g.items.map((i) => i.id))
    const observers: IntersectionObserver[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id)
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ThemeToggle />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-8 py-20 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              DESIGN SYSTEM
            </span>
            <span className="size-0.5 rounded-full bg-muted-foreground inline-block" />
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              v1.0
            </span>
            <span className="size-0.5 rounded-full bg-muted-foreground inline-block" />
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Updated today
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl">
            Design that <span className="text-primary">ships</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Tokens, primitives, and patterns powering shep-ai. Built on OKLCH color space, Geist
            typography, and Tailwind v4. Every component shown below is in production.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <a
              href="#colors"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Explore tokens
              <ArrowRightIcon className="size-3.5" />
            </a>
            <a
              href="#buttons"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              View components
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-border">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                Colors
              </p>
              <p className="text-2xl font-semibold tabular-nums">20+</p>
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                Components
              </p>
              <p className="text-2xl font-semibold tabular-nums">12</p>
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                Patterns
              </p>
              <p className="text-2xl font-semibold tabular-nums">4</p>
            </div>
            <div className="ml-auto hidden md:flex flex-col items-end">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                Stack
              </p>
              <p className="text-xs font-mono">React 19 · Tailwind v4 · OKLCH</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2-column layout ── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          <SectionNav activeSection={activeSection} />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-20">

            {/* ── TOKENS GROUP BANNER ── */}
            <GroupBanner
              chartVar="--chart-1"
              category="Category 01 · Foundation"
              headline="Tokens are the truth."
              body="Every color, size, and shape starts here. Change a token, change the entire system in one keystroke. Nothing is hardcoded — if it matters, it lives in globals.css."
              meta={['4 sections', 'OKLCH color space', '20+ swatches']}
            />

            {/* ── Colors ── */}
            <Section
              id="colors"
              preheader="TOKENS / COLORS"
              title="Color"
              detail="18 tokens · OKLCH"
              description="Single source of truth for every surface, text, and border. Light and dark themes share the same names — only the values change. Click any swatch to inspect."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {COLOR_TOKENS.map((token) => (
                  <div
                    key={token.var}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="size-12 rounded-md shrink-0 border border-border"
                      style={{ background: `var(${token.var})` }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium truncate">{token.var}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate leading-relaxed">
                        {token.value}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{token.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Typography ── */}
            <Section
              id="typography"
              preheader="TOKENS / TYPE"
              title="Typography"
              detail="7 levels · Geist"
              description={`Geist Sans for UI copy, Geist Mono for technical details and code references. \`tracking-tight\` applies above text-xl — keep display sizes dense.`}
            >
              <div className="space-y-4">
                {[
                  { label: 'Display', cls: 'text-4xl font-semibold tracking-tight', spec: 'text-4xl · font-semibold · tracking-tight' },
                  { label: 'Page title', cls: 'text-3xl font-semibold tracking-tight', spec: 'text-3xl · font-semibold · tracking-tight' },
                  { label: 'Section title', cls: 'text-xl font-semibold', spec: 'text-xl · font-semibold' },
                  { label: 'Card title', cls: 'text-base font-semibold', spec: 'text-base · font-semibold' },
                  { label: 'Body text — what most people read', cls: 'text-sm', spec: 'text-sm' },
                  { label: 'Caption / muted', cls: 'text-xs text-muted-foreground', spec: 'text-xs · text-muted-foreground' },
                  { label: 'trace_id_abc123 · mono detail', cls: 'text-xs font-mono', spec: 'text-xs · font-mono' },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <p className={`w-72 shrink-0 ${row.cls}`}>{row.label}</p>
                    <span className="text-xs text-muted-foreground font-mono">{row.spec}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Spacing ── */}
            <Section
              id="spacing"
              preheader="TOKENS / SPACING"
              title="Spacing"
              detail="4px base unit"
              description="Everything snaps to a 4px grid. The scale covers component internals (1–8) through section breathing room (12–32). Never eyeball — pick a step."
            >
              <div className="space-y-3">
                {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
                  <div key={n} className="flex items-center gap-4">
                    <span className="text-xs font-mono w-20 text-muted-foreground shrink-0">
                      {n} · {n * 4}px
                    </span>
                    <div
                      className="h-4 bg-primary/70 rounded-sm shrink-0"
                      style={{ width: `${n * 4}px` }}
                    />
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Radius ── */}
            <Section
              id="radius"
              preheader="TOKENS / RADIUS"
              title="Radius"
              detail="Base: 0.625rem"
              description="One CSS variable, infinite scale via calc(). Use rounded-lg for cards, rounded-md for inputs and buttons, rounded-full for pills and avatars."
            >
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                {(['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const).map((r) => (
                  <div key={r} className="flex flex-col items-center gap-2">
                    <div
                      className={`size-16 bg-primary/15 border border-primary/40 rounded-${r}`}
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      rounded-{r}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Callout 1: Quote ── */}
            <aside className="my-16 max-w-3xl mx-auto">
              <blockquote className="border-l-2 border-primary pl-6 py-2">
                <p className="text-2xl font-semibold tracking-tight leading-snug text-foreground">
                  &quot;Tokens scale. Components compose. Patterns repeat.&quot;
                </p>
                <footer className="mt-4 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="uppercase tracking-widest">Design principles</span>
                  <span className="size-0.5 rounded-full bg-muted-foreground inline-block" />
                  <span>shep-ai · 2026</span>
                </footer>
              </blockquote>
            </aside>

            <GroupDivider label="End of Tokens" />

            {/* ── PRIMITIVES GROUP BANNER ── */}
            <GroupBanner
              chartVar="--chart-2"
              category="Category 02 · Primitives"
              headline="Build with intent."
              body="The smallest units of interface — buttons that feel like buttons, badges that mean something. Each primitive ships with every variant you'll ever need."
              meta={['8 sections', 'CVA variants', 'base-ui foundation']}
            />

            {/* ── Buttons ── */}
            <Section
              id="buttons"
              preheader="PRIMITIVES / BUTTONS"
              title="Buttons"
              detail="6 variants · 4 sizes"
              description={`Built on base-ui with CVA variants. Use \`default\` for primary actions, \`outline\` for secondary, \`ghost\` inside dense surfaces. Never more than one \`default\` per view.`}
            >
              <div className="space-y-6">
                {(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map(
                  (variant) => (
                    <div key={variant} className="space-y-2">
                      <p className="text-xs font-mono text-muted-foreground">{variant}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant={variant} size="sm">Small</Button>
                        <Button variant={variant}>Default</Button>
                        <Button variant={variant} size="lg">Large</Button>
                        <Button variant={variant} size="icon" aria-label="icon">
                          <SearchIcon />
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Section>

            {/* ── Badges ── */}
            <Section
              id="badges"
              preheader="PRIMITIVES / BADGES"
              title="Badges"
              detail="7 semantic variants"
              description="Inline status labels with semantic meaning baked into the variant name. Keep copy to 1–2 words. Never use color alone — pair it with a label."
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono">Variants</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">default</Badge>
                    <Badge variant="primary">primary</Badge>
                    <Badge variant="success">success</Badge>
                    <Badge variant="warning">warning</Badge>
                    <Badge variant="danger">danger</Badge>
                    <Badge variant="info">info</Badge>
                    <Badge variant="muted">muted</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-mono">In context</p>
                  {[
                    { label: 'Status: trace ok', badge: <Badge variant="success">ok</Badge> },
                    { label: 'Status: trace running', badge: <Badge variant="warning">running</Badge> },
                    { label: 'Kind: agent', badge: <Badge variant="info">agent</Badge> },
                    { label: 'Kind: workflow', badge: <Badge variant="warning">workflow</Badge> },
                  ].map(({ label, badge }) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── Inputs ── */}
            <Section
              id="inputs"
              preheader="PRIMITIVES / INPUTS"
              title="Inputs"
              detail="h-8 · ring on focus"
              description={`base-ui/input wrapper. Full width, 8-height, ring on focus via \`--ring\`. Pass \`aria-invalid\` for error states — no extra prop needed.`}
            >
              <div className="space-y-5 max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Default</label>
                  <Input placeholder="Type something..." />
                  <p className="text-xs text-muted-foreground">Helper text goes here.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">With prefix icon</label>
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search agents..." className="pl-8" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-destructive">Error state</label>
                  <Input
                    placeholder="Invalid input"
                    aria-invalid="true"
                    defaultValue="bad_value"
                  />
                  <p className="text-xs text-destructive">This field is required.</p>
                </div>
              </div>
            </Section>

            {/* ── Selects ── */}
            <Section
              id="selects"
              preheader="PRIMITIVES / SELECTS"
              title="Selects"
              detail="Composable parts"
              description="base-ui/select with composable trigger, content, and item slots. Matches Input sizing. Works controlled and uncontrolled."
            >
              <div className="space-y-3 max-w-xs">
                <Select defaultValue="gpt4">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt4">GPT-4o</SelectItem>
                    <SelectItem value="claude">Claude Sonnet</SelectItem>
                    <SelectItem value="gemini">Gemini 1.5 Pro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default value: <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">gpt4</code>
                </p>
              </div>
            </Section>

            {/* ── Switches ── */}
            <Section
              id="switches"
              preheader="PRIMITIVES / CONTROLS"
              title="Switches & Checkboxes"
              detail="base-ui primitives"
              description={`Accessible by default — keyboard navigable, ARIA attributes built in. Use \`<Switch>\` for binary settings, \`<Checkbox>\` for multi-select within a group.`}
            >
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-mono text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded">Checkbox</code>
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Enable RAG retrieval', checked: ragChecked, set: setRagChecked },
                      { label: 'Stream responses', checked: streamChecked, set: setStreamChecked },
                      { label: 'Log traces', checked: logChecked, set: setLogChecked },
                    ].map(({ label, checked, set }) => (
                      <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => set(v === true)}
                        />
                        <span className="text-sm group-hover:text-foreground transition-colors">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-mono text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded">Switch</code>
                  </p>
                  <div className="space-y-3">
                    {[
                      { label: 'Dark mode', checked: darkModeOn, set: setDarkModeOn },
                      { label: 'Notifications', checked: notificationsOn, set: setNotificationsOn },
                    ].map(({ label, checked, set }) => (
                      <label key={label} className="flex items-center gap-3 cursor-pointer">
                        <Switch
                          checked={checked}
                          onCheckedChange={(v) => set(v)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Dialog ── */}
            <Section
              id="dialog"
              preheader="PRIMITIVES / OVERLAYS"
              title="Dialog"
              detail="Backdrop blur · animated"
              description="base-ui/dialog with enter/exit animations and a composable footer. Use for destructive confirmations and focused forms — not for navigation."
            >
              <Dialog>
                <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete agent</DialogTitle>
                    <DialogDescription>
                      This will permanently remove the agent and all its conversation history. This
                      action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogTrigger render={<Button variant="ghost" />}>Cancel</DialogTrigger>
                    <Button variant="destructive">Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Section>

            {/* ── Dropdown ── */}
            <Section
              id="dropdown"
              preheader="PRIMITIVES / MENUS"
              title="DropdownMenu"
              detail="Keyboard nav · animated"
              description="base-ui/menu with enter/exit animations and full keyboard navigation. Destructive items get a red tint — always place them last with a separator."
            >
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline">Actions</Button>} />
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <PencilIcon className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CopyIcon className="size-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash2Icon className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Section>

            {/* ── Charts ── */}
            <Section
              id="charts"
              preheader="PRIMITIVES / DATA VIZ"
              title="Charts"
              detail="Pure SVG · zero deps"
              description={`No chart library. \`<Sparkline>\` for inline trends in stat cards, \`<BarChart>\` for histograms on analytics pages, \`<WorkflowThumbnail>\` for flow previews.`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded">Sparkline</code>
                  </p>
                  <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-center">
                    <Sparkline
                      data={[3, 4, 2, 5, 6, 4, 7]}
                      width={120}
                      height={40}
                      color="oklch(0.6 0.22 250)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used in StatCard trends</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded">BarChart</code>
                  </p>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <BarChart
                      data={[5, 7, 3, 9, 6, 4, 8, 2, 7, 5, 9, 6, 4, 8, 3, 7, 5, 8, 4, 6, 9, 3, 7, 5, 8, 4, 6, 9, 7, 5]}
                      height={60}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used in Analytics page</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded">WorkflowThumbnail</code>
                  </p>
                  <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-center">
                    <WorkflowThumbnail definition={demoDefinition} width={160} height={80} />
                  </div>
                  <p className="text-xs text-muted-foreground">Used in Workflows list</p>
                </div>
              </div>
            </Section>

            {/* ── Callout 2: Tip with icon ── */}
            <aside className="my-16 rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-8 flex items-start gap-5">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LightbulbIcon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                    Pro tip
                  </p>
                  <h4 className="text-lg font-semibold tracking-tight">Compose, don&apos;t customize.</h4>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Prefer composing existing primitives over adding props. A{' '}
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">Card</code>{' '}
                    with a{' '}
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">Badge</code>{' '}
                    inside it is more flexible than a{' '}
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">CardWithBadge</code>.
                  </p>
                </div>
              </div>
            </aside>

            <GroupDivider label="End of Primitives" />

            {/* ── COMPOSED GROUP BANNER ── */}
            <GroupBanner
              chartVar="--chart-3"
              category="Category 03 · Composed"
              headline="Patterns, repeated."
              body="What happens when primitives grow up. These components ship on real product surfaces — they're not demos, they're the actual code."
              meta={['5 sections', 'shared/ exports', 'production-ready']}
            />

            {/* ── StatCard ── */}
            <Section
              id="statcard"
              preheader="COMPOSED / METRICS"
              title="StatCard"
              detail="Icon · trend · hint"
              description={`Metric display tile used across the dashboard. Pass \`trend\` to show a percentage delta. Grid-friendly — always use in a 3 or 4-column layout.`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Conversations"
                  value={1247}
                  icon={MessageSquareIcon}
                  hint="total"
                />
                <StatCard
                  label="Tokens used"
                  value="2.4M"
                  trend={{ value: 12, positive: true }}
                />
                <StatCard
                  label="Failed runs"
                  value={8}
                  icon={AlertCircleIcon}
                  trend={{ value: 4, positive: false }}
                  hint="last 24h"
                />
              </div>
            </Section>

            {/* ── PageHeader ── */}
            <Section
              id="pageheader"
              preheader="COMPOSED / LAYOUT"
              title="PageHeader"
              detail="title · description · actions · breadcrumb"
              description={`Consistent top-of-page chrome exported as \`<PageHeader>\`. The \`actions\` slot accepts any React node — buttons, selects, whatever the page needs.`}
            >
              <div className="space-y-4 -m-6">
                <div>
                  <p className="text-xs font-mono text-muted-foreground px-6 pt-4 pb-2">Basic</p>
                  <PageHeader
                    title="Observability"
                    description="Inspect traces, spans, and latency across all agent executions."
                  />
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground px-6 pb-2">With actions</p>
                  <PageHeader
                    title="Workflows"
                    description="Build and manage multi-step agent pipelines."
                    actions={<Button size="sm">New workflow</Button>}
                  />
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground px-6 pb-2">With breadcrumb</p>
                  <PageHeader
                    title="Legal docs"
                    breadcrumb={
                      <a href="#pageheader" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        ← All knowledge bases
                      </a>
                    }
                    description="3 documents · Last synced 12 min ago."
                  />
                </div>
              </div>
            </Section>

            {/* ── EmptyState ── */}
            <Section
              id="emptystate"
              preheader="COMPOSED / FEEDBACK"
              title="EmptyState"
              detail="Icon · title · CTA"
              description={`Full-bleed centered state for empty lists and first-time experiences. Always pair with a \`<Button>\` CTA when the user has a clear next action.`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EmptyState
                  icon={InboxIcon}
                  title="No items yet"
                  description="Things will show up here once you create them."
                />
                <EmptyState
                  icon={FileIcon}
                  title="No documents"
                  description="Upload files to start building your knowledge base."
                  action={<Button size="sm">Upload document</Button>}
                />
              </div>
            </Section>

            {/* ── DataTable ── */}
            <Section
              id="datatable"
              preheader="COMPOSED / TABLES"
              title="DataTable"
              detail="Loading · populated · empty"
              description={`Composable table shell used for agent runs, conversations, and knowledge entries. Pass \`loading\` for skeleton rows, \`empty\` for a zero-state slot, or \`children\` for \`<tr>\` rows.`}
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Loading state</p>
                  <DataTable headers={['Name', 'Status', 'Updated']} loading loadingRows={3} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Populated</p>
                  <DataTable headers={['Name', 'Status', 'Updated']}>
                    {TABLE_ROWS.map((row) => (
                      <tr key={row.name} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono">{row.name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              row.status === 'ok'
                                ? 'success'
                                : row.status === 'running'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.updated}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Empty state</p>
                  <DataTable
                    headers={['Name', 'Status', 'Updated']}
                    empty={
                      <EmptyState
                        icon={InboxIcon}
                        title="No runs yet"
                        description="Execute an agent to see results here."
                      />
                    }
                  />
                </div>
              </div>
            </Section>

            {/* ── Cards ── */}
            <Section
              id="cards"
              preheader="COMPOSED / CARDS"
              title="Cards"
              detail="3 compositions"
              description="Not a dedicated component — just composition. A card is border + bg-card + rounded-xl. Everything else — stats footer, hover state, inner badge — is added as needed."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-foreground/15 bg-card p-5 space-y-2">
                  <p className="text-xs text-muted-foreground font-mono">Basic</p>
                  <p className="text-sm font-semibold">Support agent</p>
                  <p className="text-xs text-muted-foreground">
                    Handles Tier-1 customer queries using the knowledge base.
                  </p>
                </div>
                <div className="rounded-xl border border-foreground/15 bg-card p-5 space-y-2 hover:border-foreground/30 hover:shadow-sm transition-all cursor-pointer group">
                  <p className="text-xs text-muted-foreground font-mono">Interactive</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Research agent</p>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">
                      →
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Browses the web and synthesises summaries on demand.
                  </p>
                </div>
                <div className="rounded-xl border border-foreground/15 bg-card overflow-hidden">
                  <div className="p-5 space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">With stats</p>
                    <p className="text-sm font-semibold">Classifier agent</p>
                    <p className="text-xs text-muted-foreground">
                      Routes incoming requests to the right downstream handler.
                    </p>
                  </div>
                  <div className="border-t border-border px-5 py-3 bg-muted/30 flex gap-6">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Runs</p>
                      <p className="text-sm font-semibold tabular-nums">2,418</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg latency</p>
                      <p className="text-sm font-semibold tabular-nums">340ms</p>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Callout 3: Three principles ── */}
            <aside className="my-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: 'PRINCIPLE 01',
                  title: 'Tokens first',
                  body: 'Hardcode nothing. If a value matters, it lives in globals.css. Every color, radius, and spacing unit is a CSS variable.',
                },
                {
                  label: 'PRINCIPLE 02',
                  title: 'Compose primitives',
                  body: 'Two simple pieces beat one clever one. Build complexity at the leaves, not in the component API.',
                },
                {
                  label: 'PRINCIPLE 03',
                  title: 'Ship the system',
                  body: 'A pattern only matters if it appears more than twice. Otherwise it is a one-off — keep it inline.',
                },
              ].map((p) => (
                <div key={p.label} className="border-l-2 border-primary/50 pl-5">
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                    {p.label}
                  </p>
                  <h4 className="text-base font-semibold tracking-tight">{p.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              ))}
            </aside>

            <GroupDivider label="End of Composed" />

            {/* ── PATTERNS GROUP BANNER ── */}
            <GroupBanner
              chartVar="--chart-4"
              category="Category 04 · Patterns"
              headline="The shape of motion."
              body="Empty states, loading, filtering. The choreography of getting things done. These patterns make the difference between an app that feels polished and one that just works."
              meta={['4 sections', 'zero-state design', 'motion primitives']}
            />

            {/* ── Filter chips ── */}
            <Section
              id="filterchips"
              preheader="PATTERNS / FILTERING"
              title="Filter chips"
              detail="Pill toggles · single-select"
              description="Pill-style toggle buttons for categorical filtering. One active state at a time in most cases. Keep labels short — 1 word is ideal, 2 is the max."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Basic group</p>
                  <div className="flex flex-wrap gap-1" role="group">
                    {['All', 'Active', 'Archived'].map((label) => (
                      <button
                        key={label}
                        onClick={() => setFilterActive(label)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          filterActive === label
                            ? 'border-primary text-primary bg-primary/8'
                            : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{filterActive}</code>
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Status indicators ── */}
            <Section
              id="statusindicators"
              preheader="PATTERNS / STATUS"
              title="Status indicators"
              detail="Dots · badges · timeline"
              description="The visual language of agent execution state. Dot runs for compact history, badge rows for explicit labeling, trace timeline for span visualization."
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Recent run dots</p>
                  <div className="flex items-center gap-1">
                    {['ok', 'ok', 'ok', 'warning', 'error'].map((s, i) => (
                      <span
                        key={i}
                        title={s}
                        className={`size-2.5 rounded-full ${
                          s === 'ok'
                            ? 'bg-green-500'
                            : s === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">Last 5 runs</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Badge row</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">ok</Badge>
                    <Badge variant="warning">running</Badge>
                    <Badge variant="danger">error</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Trace timeline</p>
                  <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                    {[
                      { left: '5%', width: '25%', color: 'bg-primary/70' },
                      { left: '28%', width: '40%', color: 'bg-chart-2/70' },
                      { left: '65%', width: '20%', color: 'bg-chart-3/70' },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className={`absolute top-2 bottom-2 rounded-sm ${bar.color}`}
                        style={{ left: bar.left, width: bar.width }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Skeletons ── */}
            <Section
              id="skeletons"
              preheader="PATTERNS / LOADING"
              title="Skeleton loaders"
              detail="animate-pulse · shape-matched"
              description="Pulse animation placeholders that mirror the exact shape of real content. No library — just bg-muted + animate-pulse + the right border-radius. Always match the skeleton to the loaded component."
            >
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Card skeletons</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-32 rounded-xl bg-muted animate-pulse border border-border"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Table row skeletons</p>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-10 rounded-lg bg-muted animate-pulse border border-border"
                        style={{ opacity: 1 - i * 0.12 }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Stat card skeletons</p>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-24 rounded-xl bg-muted animate-pulse border border-border"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Avatar list ── */}
            <Section
              id="avatars"
              preheader="PATTERNS / IDENTITY"
              title="Avatar list"
              detail="Stacked · overflow"
              description="Overlapping avatars for participant counts, agent collaborators, or team members. Use initials when no photo is available. Always show an overflow count for groups larger than 4."
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Stacked initials</p>
                  <div className="flex -space-x-2">
                    {['A', 'B', 'C', '+4'].map((c, i) => (
                      <div
                        key={i}
                        className="size-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-foreground shadow-sm"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Larger with names</p>
                  <div className="flex -space-x-3">
                    {[
                      { initial: 'F', label: 'Francisco' },
                      { initial: 'M', label: 'Maria' },
                      { initial: 'J', label: 'Jorge' },
                    ].map(({ initial, label }) => (
                      <div
                        key={label}
                        title={label}
                        className="size-9 rounded-full bg-primary/15 border-2 border-background flex items-center justify-center text-xs font-semibold text-primary shadow-sm cursor-default"
                      >
                        {initial}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <GroupDivider label="End of Patterns" />

            {/* ── ADVANCED PRIMITIVES GROUP BANNER ── */}
            <GroupBanner
              chartVar="--chart-5"
              category="Category 05 · Advanced Primitives"
              headline="27 new components. Zero compromises."
              body="Foundations, AI-native, observability, platform, forms, and polish. Every piece built token-first, prop-first, and production-ready from day one."
              meta={['27 components', '6 tiers', 'sonner · cmdk']}
            />

            {/* ── TIER A: Foundations ── */}
            <Section
              id="adv-tier-a"
              preheader="ADVANCED / FOUNDATIONS"
              title="Foundations"
              detail="Toast · Alert · Spinner · ProgressBar"
              description="Core feedback and loading primitives. Toast uses sonner with design token override. Alert has 4 semantic variants. Spinner ships 3 styles."
            >
              <div className="space-y-8">

                {/* Toast */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Toast · sonner wrapper</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => toast.success('Agent deployed', 'web-scraper-v2 is now running.')}>
                      Success toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.error('Run failed', 'Connection timeout after 30s.')}>
                      Error toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info('New version', 'Claude Sonnet 3.7 is available.')}>
                      Info toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.loading('Ingesting documents…')}>
                      Loading toast
                    </Button>
                  </div>
                </div>

                {/* Alert */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Alert · 4 variants</p>
                  <div className="space-y-2">
                    <Alert variant="info" title="Rate limit approaching" description="You've used 82% of your monthly token quota. Upgrade to continue." />
                    <Alert variant="success" title="Deployment successful" description="Agent web-scraper-v2 is live and processing requests." onDismiss={() => {}} />
                    <Alert variant="warning" description="This action will affect all agents in the workspace." />
                    <Alert variant="danger" title="Run failed" description="The agent encountered an unrecoverable error. Check the trace log." action={<Button size="sm" variant="outline" className="shrink-0">View trace</Button>} />
                  </div>
                </div>

                {/* Spinner */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Spinner · 3 variants · 3 sizes</p>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Spinner size="sm" />
                      <Spinner />
                      <Spinner size="lg" />
                      <span className="text-xs text-muted-foreground">default</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Spinner variant="dots" size="sm" />
                      <Spinner variant="dots" />
                      <Spinner variant="dots" size="lg" />
                      <span className="text-xs text-muted-foreground">dots</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Spinner variant="pulse" size="sm" />
                      <Spinner variant="pulse" />
                      <Spinner variant="pulse" size="lg" />
                      <span className="text-xs text-muted-foreground">pulse</span>
                    </div>
                  </div>
                </div>

                {/* ProgressBar */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">ProgressBar · 4 variants</p>
                  <div className="space-y-3 max-w-md">
                    <ProgressBar value={65} label="Tokens used" showValue />
                    <ProgressBar value={92} variant="danger" label="Storage quota" showValue />
                    <ProgressBar value={78} variant="warning" label="Rate limit" showValue />
                    <ProgressBar value={100} variant="success" label="Ingestion" showValue />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── TIER C: Observability ── */}
            <Section
              id="adv-tier-c"
              preheader="ADVANCED / OBSERVABILITY"
              title="Observability"
              detail="MetricCard · JSONViewer · KeyValueGrid · HeatMap · Donut · Timeline"
              description="Dense data display components for trace inspection, metrics dashboards, and activity visualization."
            >
              <div className="space-y-8">

                {/* MetricCard */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">MetricCard · with sparkline</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <MetricCard label="Total runs" value="12,847" trend={{ value: 8, positive: true }} sparkline={[40, 55, 30, 70, 60, 80, 65, 90, 75, 85]} comparison="vs last 7d" />
                    <MetricCard label="Avg latency" value="340ms" icon={ActivityIcon} trend={{ value: 12, positive: false }} sparkline={[30, 45, 60, 40, 55, 35, 50, 45, 60, 40]} />
                    <MetricCard label="Success rate" value="99.2%" icon={CheckCircleIcon} sparkline={[95, 98, 97, 99, 98, 100, 99, 98, 99, 100]} />
                  </div>
                </div>

                {/* JSONViewer */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">JSONViewer · recursive · collapsible</p>
                  <div className="rounded-lg border border-border bg-card p-4 max-w-lg">
                    <JSONViewer data={{
                      trace_id: 'tr_abc123def',
                      status: 'completed',
                      duration_ms: 1240,
                      model: 'claude-sonnet-4-6',
                      usage: { input_tokens: 1024, output_tokens: 312 },
                      tools: ['web_search', 'rag_retrieve'],
                    }} />
                  </div>
                </div>

                {/* KeyValueGrid */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">KeyValueGrid · 3-column</p>
                  <KeyValueGrid items={[
                    { label: 'Trace ID', value: 'tr_abc123def', mono: true },
                    { label: 'Agent', value: 'web-scraper-v2' },
                    { label: 'Model', value: 'claude-sonnet-4-6', mono: true },
                    { label: 'Duration', value: '1.24s', mono: true },
                    { label: 'Status', value: 'completed' },
                    { label: 'Tokens', value: '1,336', mono: true },
                  ]} />
                </div>

                {/* HeatMap */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">HeatMap · GitHub-style activity grid</p>
                  <HeatMap
                    data={HEATMAP_DEMO_DATA}
                    weeks={12}
                  />
                </div>

                {/* Donut */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Donut · proportional SVG segments</p>
                  <div className="flex flex-wrap gap-8">
                    <Donut
                      segments={[
                        { label: 'Completed', value: 847 },
                        { label: 'Running', value: 23 },
                        { label: 'Failed', value: 12 },
                        { label: 'Queued', value: 5 },
                      ]}
                      centerLabel="887 runs"
                    />
                    <Donut
                      segments={[
                        { label: 'Anthropic', value: 60 },
                        { label: 'OpenAI', value: 30 },
                        { label: 'Ollama', value: 10 },
                      ]}
                      size={100}
                      thickness={20}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Timeline · execution events</p>
                  <div className="max-w-md">
                    <Timeline items={[
                      { timestamp: '14:02:01.000', title: 'Agent run started', variant: 'default' },
                      { timestamp: '14:02:01.340', title: 'RAG retrieve', description: 'Found 4 relevant chunks from knowledge base.', variant: 'success' },
                      { timestamp: '14:02:02.100', title: 'LLM call', description: 'claude-sonnet-4-6 · 1024 input tokens', icon: ActivityIcon, variant: 'default' },
                      { timestamp: '14:02:03.240', title: 'Tool: web_search', description: 'Queried "latest EU AI Act requirements"', variant: 'default' },
                      { timestamp: '14:02:04.810', title: 'Run completed', description: '1.81s total · 1,336 tokens', variant: 'success' },
                    ]} />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── TIER B: AI / Agent ── */}
            <Section
              id="adv-tier-b"
              preheader="ADVANCED / AI · AGENT"
              title="AI / Agent"
              detail="ModelBadge · AgentAvatar · CodeBlock · StreamingText · MessageBubble · ToolCallCard · PromptInput"
              description="Purpose-built components for AI chat surfaces. MessageBubble supports rich content including embedded CodeBlocks and StreamingText cursors."
            >
              <div className="space-y-8">

                {/* ModelBadge + AgentAvatar */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">ModelBadge + AgentAvatar</p>
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">ModelBadge</p>
                      <div className="flex flex-wrap gap-2">
                        <ModelBadge provider="anthropic" model="claude-sonnet-4-6" />
                        <ModelBadge provider="openai" model="gpt-4o" />
                        <ModelBadge provider="ollama" model="llama3.2" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">AgentAvatar · 3 sizes</p>
                      <div className="flex items-end gap-3">
                        <AgentAvatar name="Research Agent" provider="anthropic" size="sm" />
                        <AgentAvatar name="Support Agent" provider="openai" size="md" />
                        <AgentAvatar name="Data Agent" provider="ollama" size="lg" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CodeBlock */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">CodeBlock · copy on click · line numbers</p>
                  <CodeBlock
                    filename="agent-runner.ts"
                    language="typescript"
                    code={`import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function runAgent(prompt: string) {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    maxSteps: 10,
  })
  return text
}`}
                  />
                </div>

                {/* StreamingText */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">StreamingText · blinking cursor</p>
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card text-sm">
                    <span className="text-muted-foreground text-xs shrink-0">streaming=true</span>
                    <StreamingText text="The EU AI Act requires high-risk AI systems to maintain detailed logs" isStreaming={true} />
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card text-sm">
                    <span className="text-muted-foreground text-xs shrink-0">streaming=false</span>
                    <StreamingText text="The EU AI Act requires high-risk AI systems to maintain detailed logs of all decisions." isStreaming={false} />
                  </div>
                </div>

                {/* MessageBubble */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">MessageBubble · user / assistant / system</p>
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
                    <MessageBubble role="system" content="You are a helpful AI assistant specialized in EU compliance." />
                    <MessageBubble
                      role="user"
                      content="How do I log agent decisions for GDPR compliance?"
                      timestamp="14:02:01"
                    />
                    <MessageBubble
                      role="assistant"
                      content={
                        <div className="space-y-3">
                          <p>For GDPR compliance, you need to implement structured audit logging. Here&apos;s a minimal setup:</p>
                          <CodeBlock
                            language="typescript"
                            code={`await auditLog.record({
  agentId: agent.id,
  action: 'decision',
  input: prompt,
  output: response,
  timestamp: new Date().toISOString(),
})`}
                          />
                        </div>
                      }
                      timestamp="14:02:04"
                      tokens={312}
                      model="claude-sonnet-4-6"
                    />
                  </div>
                </div>

                {/* ToolCallCard */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">ToolCallCard · completed + failed</p>
                  <div className="space-y-3 max-w-xl">
                    <ToolCallCard
                      name="rag_retrieve"
                      args={{ query: 'EU AI Act compliance logging', topK: 5 }}
                      result={[
                        { score: 0.92, text: 'Article 12 requires high-risk systems to record all inputs...' },
                        { score: 0.87, text: 'Annex IV mandates retention of logs for at least 5 years...' },
                      ]}
                      status="completed"
                      durationMs={340}
                    />
                    <ToolCallCard
                      name="web_search"
                      args={{ query: 'GDPR audit logging best practices 2025' }}
                      status="failed"
                      durationMs={5002}
                      error="Request timeout: no response after 5000ms"
                    />
                  </div>
                </div>

                {/* PromptInput */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">PromptInput · auto-resize · Cmd+Enter</p>
                  <div className="max-w-xl">
                    <PromptInput
                      value={promptValue}
                      onChange={setPromptValue}
                      onSubmit={() => { toast.success('Message sent', promptValue.slice(0, 40) || 'Empty'); setPromptValue('') }}
                      placeholder="Ask anything about your agents…"
                      onAttach={() => toast.info('Attach file', 'File picker would open here.')}
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── TIER D: Platform ── */}
            <Section
              id="adv-tier-d"
              preheader="ADVANCED / PLATFORM"
              title="Platform"
              detail="CommandPalette · Breadcrumb · Tabs"
              description="Navigation and discovery components. CommandPalette (⌘K) is wired globally in the app layout — press it now to see it live."
            >
              <div className="space-y-8">

                {/* CommandPalette */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">CommandPalette · ⌘K shortcut · already wired in layout</p>
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20">
                    <span className="text-sm text-muted-foreground">Press</span>
                    <KeyboardShortcut keys={['⌘', 'K']} />
                    <span className="text-sm text-muted-foreground">anywhere in the app to open it.</span>
                  </div>
                </div>

                {/* Breadcrumb */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Breadcrumb · ChevronRight separators</p>
                  <div className="space-y-3">
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Knowledge Bases', href: '/knowledge-bases' }, { label: 'Legal docs' }]} />
                    <Breadcrumb items={[{ label: 'Agents', href: '/agents' }, { label: 'web-scraper-v2', href: '/agents/123' }, { label: 'Execution #847' }]} />
                  </div>
                </div>

                {/* Tabs */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Tabs · underline style · controlled</p>
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      items={[
                        { value: 'overview', label: 'Overview', icon: ActivityIcon },
                        { value: 'runs', label: 'Runs', icon: GitBranchIcon },
                        { value: 'settings', label: 'Settings' },
                      ]}
                    />
                    <div className="p-4">
                      <Tabs.Content value="overview" current={activeTab}>
                        <p className="text-sm text-muted-foreground">Agent overview and stats go here.</p>
                      </Tabs.Content>
                      <Tabs.Content value="runs" current={activeTab}>
                        <p className="text-sm text-muted-foreground">Execution history table goes here.</p>
                      </Tabs.Content>
                      <Tabs.Content value="settings" current={activeTab}>
                        <p className="text-sm text-muted-foreground">Agent configuration form goes here.</p>
                      </Tabs.Content>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── TIER E: Forms ── */}
            <Section
              id="adv-tier-e"
              preheader="ADVANCED / FORMS"
              title="Advanced Forms"
              detail="Combobox · DateRangePicker · MultiSelect · CronInput · FileUpload"
              description="Form primitives for complex inputs. All are controlled, no extra npm deps, built with the installed cmdk and native browser APIs."
            >
              <div className="space-y-8">

                {/* Combobox */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">Combobox · searchable single-select</p>
                  <div className="max-w-xs">
                    <Combobox
                      value={comboValue}
                      onChange={setComboValue}
                      options={[
                        { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Anthropic · Fast, balanced' },
                        { value: 'claude-opus-4', label: 'Claude Opus 4', description: 'Anthropic · Most capable' },
                        { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI · Multimodal' },
                        { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'OpenAI · Fast & cheap' },
                        { value: 'llama3.2', label: 'Llama 3.2', description: 'Ollama · Local' },
                      ]}
                      placeholder="Select model..."
                    />
                    {comboValue && <p className="text-xs text-muted-foreground mt-2 font-mono">Selected: {comboValue}</p>}
                  </div>
                </div>

                {/* DateRangePicker */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">DateRangePicker · presets + native inputs</p>
                  <DateRangePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
                  <p className="text-xs font-mono text-muted-foreground">{dateRange.from} → {dateRange.to}</p>
                </div>

                {/* MultiSelect */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">MultiSelect · chips + dropdown</p>
                  <div className="max-w-sm">
                    <MultiSelect
                      values={multiValues}
                      onChange={setMultiValues}
                      options={[
                        { value: 'react', label: 'React' },
                        { value: 'typescript', label: 'TypeScript' },
                        { value: 'nextjs', label: 'Next.js' },
                        { value: 'tailwind', label: 'Tailwind CSS' },
                        { value: 'drizzle', label: 'Drizzle ORM' },
                      ]}
                      placeholder="Add tags..."
                    />
                    <p className="text-xs text-muted-foreground mt-2 font-mono">[{multiValues.join(', ')}]</p>
                  </div>
                </div>

                {/* CronInput */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">CronInput · natural language preview</p>
                  <div className="max-w-xs">
                    <CronInput value={cronValue} onChange={setCronValue} />
                  </div>
                </div>

                {/* FileUpload */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">FileUpload · drag-drop + file list</p>
                  <div className="max-w-md">
                    <FileUpload
                      onFiles={(files) => toast.info('Files selected', `${files.length} file(s) ready`)}
                      accept=".pdf,.txt,.md"
                      maxSize={10 * 1024 * 1024}
                      multiple
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── TIER F: Polish ── */}
            <Section
              id="adv-tier-f"
              preheader="ADVANCED / POLISH"
              title="Polish"
              detail="KeyboardShortcut · UsageQuota · EmptyChart"
              description="Small touches that make an interface feel finished. KeyboardShortcut for inline shortcut hints, UsageQuota for resource meters, EmptyChart as loading placeholder."
            >
              <div className="space-y-8">

                {/* KeyboardShortcut */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">KeyboardShortcut · kbd pills</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyboardShortcut keys={['⌘', 'K']} /> Command palette
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyboardShortcut keys={['⌘', 'Enter']} /> Send message
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyboardShortcut keys={['Esc']} /> Close dialog
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyboardShortcut keys={['⌘', 'Shift', 'P']} /> Command
                    </div>
                  </div>
                </div>

                {/* UsageQuota */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">UsageQuota · brand → amber → red thresholds</p>
                  <div className="space-y-4 max-w-sm">
                    <UsageQuota used={40000} limit={100000} unit="tokens" />
                    <UsageQuota used={78000} limit={100000} unit="tokens" />
                    <UsageQuota used={93000} limit={100000} unit="tokens" />
                    <UsageQuota used={2.1 * 1024 * 1024} limit={5 * 1024 * 1024} unit="bytes" />
                  </div>
                </div>

                {/* EmptyChart */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">EmptyChart · skeleton placeholder</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <EmptyChart height={100} />
                    <EmptyChart height={100} message="Waiting for data…" />
                  </div>
                </div>
              </div>
            </Section>

            <GroupDivider label="End of Advanced Primitives" />

            {/* ─────────────────────────────────────────────────────────── */}
            {/* VISUAL PRESENCE                                              */}
            {/* ─────────────────────────────────────────────────────────── */}

            <GroupBanner
              chartVar="--chart-1"
              category="Visual presence · v1.0"
              headline="Make pages feel substantial."
              body="Five components for visual presence: Hero for landing/main pages, Banner for contextual announcements, FeatureGrid for structured discovery, SectionDivider for rhythm, SpotlightCard for emphasis."
              meta={['Hero', 'Banner', 'FeatureGrid', 'SectionDivider', 'SpotlightCard']}
            />

            {/* ── Hero ── */}
            <Section
              id="vp-hero"
              preheader="VISUAL PRESENCE"
              title="Hero"
              detail="Hero · variant default | gradient | pattern | both"
              description="Full-width page header with eyebrow, title with accent highlight, description, actions, and inline stats. Replace PageHeader on main landing pages."
            >
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">variant=&quot;default&quot; · no background</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Hero
                      eyebrow="BUILD"
                      title="Agents"
                      description="Create and manage AI agents. Each agent has its own model, tools, and knowledge base."
                      variant="default"
                      stats={[
                        { label: 'Total', value: 12 },
                        { label: 'Active providers', value: 3 },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">variant=&quot;gradient&quot; · accent word highlighted</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Hero
                      eyebrow="WORKSPACE"
                      title="Welcome back, Francisco"
                      accent="Francisco"
                      description="Your AI workspace at a glance. Track agents, workflows, and recent activity."
                      variant="gradient"
                      stats={[
                        { label: 'Conversations', value: 48 },
                        { label: 'Agents', value: 7, hint: 'active' },
                        { label: 'Documents', value: 120 },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">variant=&quot;both&quot; · gradient + dot pattern</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Hero
                      eyebrow="MARKETPLACE"
                      title="Discover agents"
                      accent="Discover"
                      description="Install agents built and shared by the community. Publish your own to reach more users."
                      variant="both"
                      align="left"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Banner ── */}
            <Section
              id="vp-banner"
              preheader="VISUAL PRESENCE"
              title="Banner"
              detail="Banner · info | success | warning | danger | feature"
              description="Contextual announcements in five semantic variants. Use sparingly — only where banners enhance discoverability or onboarding."
            >
              <div className="space-y-3">
                <Banner variant="info" title="Info banner" description="Use for neutral contextual information or guidance." />
                <Banner variant="success" title="Success banner" description="Confirm a completed action or healthy state." />
                <Banner variant="warning" title="Warning banner" description="Alert the user to something that may need attention." />
                <Banner variant="danger" title="Danger banner" description="Signal an error or destructive condition." onDismiss={() => {}} />
                <Banner
                  variant="feature"
                  title="Feature highlight"
                  description="Promote a new capability or onboarding step."
                  action={
                    <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                      Try it
                    </button>
                  }
                />
              </div>
            </Section>

            {/* ── FeatureGrid ── */}
            <Section
              id="vp-featuregrid"
              preheader="VISUAL PRESENCE"
              title="FeatureGrid"
              detail="FeatureGrid · columns 2 | 3 | 4"
              description="Structured grid of feature/capability cards. Each item can have an icon, title, description, an optional metric, and an optional href for navigation."
            >
              <FeatureGrid
                columns={3}
                items={[
                  {
                    icon: ActivityIcon,
                    title: 'Observability',
                    description: 'Trace every agent execution and workflow run with span-level detail.',
                    metric: { value: 1243, label: 'traces' },
                    href: '/observability',
                  },
                  {
                    icon: GitBranchIcon,
                    title: 'Workflows',
                    description: 'Build visual agent flows connecting inputs, conditions, and outputs.',
                    metric: { value: 8, label: 'active' },
                  },
                  {
                    icon: LightbulbIcon,
                    title: 'Knowledge bases',
                    description: 'Organize documents for RAG-powered agents with semantic search.',
                    metric: { value: '24k', label: 'chunks' },
                  },
                ]}
              />
            </Section>

            {/* ── SectionDivider ── */}
            <Section
              id="vp-sectiondivider"
              preheader="VISUAL PRESENCE"
              title="SectionDivider"
              detail="SectionDivider · align left | center | right"
              description="Minimal typographic divider with a monospaced label. Use to separate major content areas within a page body."
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-2">align=&quot;left&quot;</p>
                  <SectionDivider label="Recent activity" align="left" />
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-2">align=&quot;center&quot; (default)</p>
                  <SectionDivider label="Your agents" align="center" />
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-2">align=&quot;right&quot;</p>
                  <SectionDivider label="All traces" align="right" />
                </div>
              </div>
            </Section>

            {/* ── SpotlightCard ── */}
            <Section
              id="vp-spotlightcard"
              preheader="VISUAL PRESENCE"
              title="SpotlightCard"
              detail="SpotlightCard · variant default | gradient"
              description="Full-width emphasis card for onboarding, featured content, or quick-start calls to action. Use sparingly — one per page at most."
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">variant=&quot;default&quot;</p>
                  <SpotlightCard
                    eyebrow="GET STARTED"
                    title="Create your first agent"
                    description="Agents are AI assistants with their own model, tools, and knowledge base. Build one in under a minute."
                    action={
                      <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                        Create agent →
                      </button>
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground">variant=&quot;gradient&quot;</p>
                  <SpotlightCard
                    eyebrow="FEATURED"
                    title="Build & share agents"
                    description="Publish your agents to reach the community. They stay yours — others install copies."
                    variant="gradient"
                    action={
                      <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                        Publish agent →
                      </button>
                    }
                  />
                </div>
              </div>
            </Section>

            <GroupDivider label="End of Visual Presence" />

            {/* ── Bottom CTA banner ── */}
            <section className="relative mt-24 mb-12 overflow-hidden rounded-2xl border border-border">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
              <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="relative p-12 text-center max-w-2xl mx-auto">
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-4">
                  End of system · v1.0
                </p>
                <h2 className="text-4xl font-semibold tracking-tight">Ready to ship?</h2>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  The primitives are stable. The tokens are scoped. Build the next feature with
                  what&apos;s here — and add to the system only when a pattern repeats.
                </p>
                <div className="flex items-center justify-center gap-3 mt-8">
                  <a
                    href="#top"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
                  >
                    Back to top
                  </a>
                </div>
                <p className="mt-8 text-[11px] font-mono text-muted-foreground">
                  Built with shep-ai design tokens · OKLCH · React 19 · Tailwind v4
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
