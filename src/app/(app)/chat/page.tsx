import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import {
  ArrowUpRightIcon,
  ArrowRightIcon,
  MessageSquareIcon,
  SparklesIcon,
  BookOpenIcon,
  CodeIcon,
  PenLineIcon,
  SearchIcon,
} from 'lucide-react'
import { NewChatButton } from '@/components/chat/chat-actions'
import { ConversationsGrid } from '@/components/chat/conversations-grid'

interface StarterPrompt {
  label: string
  title: string
  prompt: string
  icon: typeof SparklesIcon
  accent: string
}

const STARTERS: StarterPrompt[] = [
  {
    label: 'WRITE',
    title: 'Draft something',
    prompt: 'Help me write a clear, concise product update for our team.',
    icon: PenLineIcon,
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'EXPLAIN',
    title: 'Break it down',
    prompt: 'Explain the concept of vector embeddings as if I were new to ML.',
    icon: BookOpenIcon,
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'CODE',
    title: 'Review my code',
    prompt: 'Review this snippet and suggest improvements with reasoning.',
    icon: CodeIcon,
    accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    label: 'RESEARCH',
    title: 'Find something',
    prompt: 'Summarize the latest thinking on agent orchestration patterns.',
    icon: SearchIcon,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
]

export default async function ChatPage() {
  const session = await auth()
  const userId = session!.user!.email!
  const firstName = session!.user!.name?.split(' ')[0] ?? 'there'

  const { conversationUseCase } = getContainer()
  const conversations = await conversationUseCase.listConversations(userId)
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* HERO — Cohere editorial */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-20 size-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 size-80 rounded-full bg-primary/10 blur-3xl" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative px-6 sm:px-10 pt-16 pb-20 max-w-7xl mx-auto">
          {/* Date + meta row */}
          <div className="flex items-center gap-3 mb-10 flex-wrap">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {dateLabel}
            </span>
            <span className="size-0.5 rounded-full bg-muted-foreground" />
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Chat
            </span>
            {conversations.length > 0 && (
              <>
                <span className="size-0.5 rounded-full bg-muted-foreground" />
                <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                  {conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}
                </span>
              </>
            )}
          </div>

          {/* Big editorial headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02] max-w-5xl">
            What are we{' '}
            <span className="text-primary">building</span> today,{' '}
            {firstName}?
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Open a new conversation, ask anything, attach files, switch models mid-thread. Your past chats stay searchable below.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 mt-10 flex-wrap">
            <NewChatButton />
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Chat with an agent
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* STARTERS — Cohere card grid */}
      <section className="px-6 sm:px-10 py-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Start something
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STARTERS.map((starter) => {
            const Icon = starter.icon
            return (
              <Link
                key={starter.label}
                href={`/chat?prompt=${encodeURIComponent(starter.prompt)}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition-all flex flex-col gap-4 min-h-[180px]"
              >
                <div className={`size-10 rounded-xl flex items-center justify-center ${starter.accent}`}>
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                    {starter.label}
                  </p>
                  <h3 className="text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
                    {starter.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {starter.prompt}
                  </p>
                </div>
                <ArrowUpRightIcon className="absolute top-5 right-5 size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* EDITORIAL CALLOUT */}
      <section className="border-y border-border bg-muted/30">
        <div className="px-6 sm:px-10 py-16 max-w-4xl mx-auto text-center">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-5">
            Tip
          </p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
            Use{' '}
            <kbd className="inline-flex items-center px-2 py-1 rounded-md border border-border bg-background text-base font-mono tracking-normal mx-1">⌘ K</kbd>
            {' '}from any page to open the command palette and jump straight into a chat.
          </p>
        </div>
      </section>

      {/* RECENT — grid of conversation cards */}
      <section className="px-6 sm:px-10 py-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Recent
          </span>
          <div className="flex-1 h-px bg-border" />
          {conversations.length > 0 && (
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}
            </span>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10">
              <div>
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                  No history yet
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Your first chat starts now.
                </h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Every conversation persists automatically. Search, filter by date, or pick up exactly where you left off.
                </p>
                <div className="mt-6">
                  <NewChatButton />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative size-40">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative size-full rounded-full bg-background border border-border flex items-center justify-center">
                    <MessageSquareIcon className="size-12 text-primary/60" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ConversationsGrid conversations={conversations} />
        )}
      </section>

      {/* CLOSING BAND — Cohere editorial */}
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
            <Link href="/agents" className="group block">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Specialize
              </p>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                Build an agent
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Custom prompt, tools, knowledge base. Chat with a specialist instead of a generalist.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Create one
                <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </Link>
            <Link href="/knowledge-bases" className="group block">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Ground
              </p>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                Add knowledge
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Upload documents so your answers come from your sources, not from training data alone.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Add files
                <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </Link>
            <Link href="/marketplace" className="group block">
              <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Discover
              </p>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                Marketplace
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Install agents shared by the community. Save time, learn patterns, ship faster.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Browse
                <ArrowUpRightIcon className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
