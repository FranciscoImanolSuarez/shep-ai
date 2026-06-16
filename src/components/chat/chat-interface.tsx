'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useCallback, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import type { Conversation, ConversationMessage } from '@/core/domain/entities/conversation'
import {
  Conversation as ConversationView,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
} from '@/components/ai-elements/prompt-input'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { ExportButton } from '@/components/chat/export-button'
import { MessageBubble } from '@/components/ai/MessageBubble'
import { ToolApprovalCard } from '@/components/chat/ToolApprovalCard'
import { toast } from '@/components/shared/Toast'
import {
  FileTextIcon,
  SparklesIcon,
  PenLineIcon,
  BookOpenIcon,
  CodeIcon,
  SearchIcon,
  DatabaseIcon,
  ArrowUpIcon,
  PaperclipIcon,
  SquareIcon,
  XIcon,
  MicIcon,
} from 'lucide-react'
import { Spinner } from '@/components/shared/Spinner'
import { parseProvider, PROVIDER_DOT } from '@/lib/model-provider'
import { extractTextFromParts } from '@/lib/ui-message'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbMessagesToUIMessages(messages: ConversationMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage['role'],
    content: m.content,
    parts: (m.parts && m.parts.length > 0
      ? (m.parts as UIMessage['parts'])
      : [{ type: 'text' as const, text: m.content }]),
    createdAt: m.createdAt,
  }))
}

async function persistMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
  })
}

async function updateTitle(conversationId: string, title: string) {
  await fetch(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

async function patchConversationModel(conversationId: string, model: string): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Failed to update model')
  }
}

function getTextFromParts(parts: UIMessage['parts']): string {
  return extractTextFromParts(parts as Array<{ type: string; text?: string }>)
}

const STARTERS = [
  { label: 'WRITE', title: 'Draft something', prompt: 'Help me write a clear product update for our team.', icon: PenLineIcon, accent: 'text-blue-600 dark:text-blue-400' },
  { label: 'EXPLAIN', title: 'Break it down', prompt: 'Explain vector embeddings as if I were new to ML.', icon: BookOpenIcon, accent: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'CODE', title: 'Review my code', prompt: 'Review this snippet and suggest improvements.', icon: CodeIcon, accent: 'text-violet-600 dark:text-violet-400' },
  { label: 'RESEARCH', title: 'Find something', prompt: 'Summarize agent orchestration patterns.', icon: SearchIcon, accent: 'text-amber-600 dark:text-amber-400' },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatInterfaceProps {
  conversation: Conversation
  initialMessages: ConversationMessage[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SourceInfo {
  source: string
  similarity: number
}

export function ChatInterface({ conversation, initialMessages }: ChatInterfaceProps) {
  const conversationId = conversation.id
  const isFirstMessageRef = useRef(initialMessages.length === 0)
  const [useRag, setUseRag] = useState(conversation.useRag)
  const [ragSources, setRagSources] = useState<SourceInfo[]>([])
  const [activeModel, setActiveModel] = useState<string>(conversation.model ?? '')

  const pendingUserTextRef = useRef<string | null>(null)
  const [composerText, setComposerText] = useState('')
  const [isListening, setIsListening] = useState(false)

  const handleModelChange = useCallback(async (modelId: string) => {
    const previous = activeModel
    setActiveModel(modelId)
    try {
      await patchConversationModel(conversationId, modelId)
    } catch (err) {
      setActiveModel(previous)
      console.error('Failed to update conversation model:', err)
    }
  }, [conversationId, activeModel])

  const { messages, sendMessage, status, stop, addToolApprovalResponse } = useChat({
    messages: dbMessagesToUIMessages(initialMessages),
    transport: new TextStreamChatTransport({
      api: '/api/chat',
      body: {
        model: activeModel || undefined,
        conversationId,
        useRag,
      },
    }),
    onFinish: async ({ message }) => {
      const userText = pendingUserTextRef.current
      if (userText) {
        await persistMessage(conversationId, 'user', userText)
        pendingUserTextRef.current = null

        if (isFirstMessageRef.current) {
          isFirstMessageRef.current = false
          const title = userText.slice(0, 60).trim()
          await updateTitle(conversationId, title)
        }

        if (useRag) {
          try {
            const res = await fetch('/api/chat/sources', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: userText }),
            })
            if (res.ok) {
              const { sources } = await res.json()
              setRagSources(sources ?? [])
            }
          } catch { /* silent */ }
        }
      }

      const assistantText = getTextFromParts(message.parts)
      if (assistantText) {
        await persistMessage(conversationId, 'assistant', assistantText)
      }
    },
    onError: () => {
      toast.error('Failed to send message')
    },
  })

  const handleSubmit = useCallback(
    ({ text }: { text: string }) => {
      const trimmed = text.trim()
      if (!trimmed) return
      pendingUserTextRef.current = trimmed
      sendMessage({ text: trimmed })
    },
    [sendMessage],
  )

  const handleStarter = useCallback((prompt: string) => {
    pendingUserTextRef.current = prompt
    sendMessage({ text: prompt })
  }, [sendMessage])

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — minimal */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm shrink-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <SparklesIcon className="size-3.5 text-primary" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">
                {conversation.title || 'New conversation'}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                {messages.length === 0 ? 'Ready' : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ExportButton conversationId={conversationId} />
          </div>
        </div>
      </header>

      {/* Messages area */}
      <ConversationView className="flex-1">
        <ConversationContent>
          <div className="max-w-3xl mx-auto px-6 py-8">
            {isEmpty ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <SparklesIcon className="size-6 text-primary" strokeWidth={2} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-xl">
                  What can I help with?
                </h2>
                <p className="mt-3 text-sm text-muted-foreground max-w-md">
                  Ask anything, attach files, switch models mid-thread. Try one of these to get started:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                  {STARTERS.map((s) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.label}
                        onClick={() => handleStarter(s.prompt)}
                        disabled={isStreaming}
                        className="group text-left p-4 rounded-2xl border border-border bg-card hover:border-foreground/30 hover:bg-muted/30 transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className={`size-3.5 ${s.accent}`} strokeWidth={2} />
                          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                            {s.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                          {s.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {s.prompt}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const text = getTextFromParts(msg.parts)
                const isLastMsg = idx === messages.length - 1
                const isStreamingThisMsg = isLastMsg && isStreaming && msg.role === 'assistant'

                const handleCopy = async () => {
                  try {
                    await navigator.clipboard.writeText(text)
                    toast.success('Copied to clipboard')
                  } catch {
                    toast.error('Failed to copy')
                  }
                }

                // P1.1: surface any pending tool approval requests inline. Each
                // request is a `tool-<name>` part with state='approval-requested'.
                const pendingApprovals = (msg.parts ?? []).filter(
                  (p): p is typeof p & {
                    state: 'approval-requested'
                    approval: { id: string }
                    input: unknown
                    type: string
                  } =>
                    typeof p === 'object' &&
                    p !== null &&
                    'state' in p &&
                    (p as { state: string }).state === 'approval-requested',
                )

                const assistantContent = (
                  <>
                    {pendingApprovals.map((p) => (
                      <ToolApprovalCard
                        key={p.approval.id}
                        part={p}
                        onRespond={(res) => addToolApprovalResponse(res)}
                      />
                    ))}
                    <MessageResponse isAnimating={isStreamingThisMsg}>
                      {text}
                    </MessageResponse>
                    {isLastMsg && ragSources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
                        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mr-1">
                          Sources
                        </span>
                        {ragSources.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground"
                            title={`Similarity: ${Math.round(s.similarity * 100)}%`}
                          >
                            <FileTextIcon className="size-3" />
                            {s.source.replace(/^gdrive:\/\//, '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )

                const userContent = (
                  <span className="whitespace-pre-wrap">{text}</span>
                )

                const ts = (msg as UIMessage & { createdAt?: Date | string }).createdAt
                  ? new Date((msg as UIMessage & { createdAt?: Date | string }).createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : undefined

                return (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role as 'user' | 'assistant'}
                    content={msg.role === 'assistant' ? assistantContent : userContent}
                    timestamp={ts}
                    model={msg.role === 'assistant' && activeModel ? activeModel : undefined}
                    onCopy={handleCopy}
                  />
                )
              })
            )}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </ConversationView>

      {/* Input area — Claude/ChatGPT-level composer */}
      <div className="bg-gradient-to-b from-transparent to-muted/30 shrink-0 pt-6">
        <div className="max-w-3xl mx-auto px-6 pb-5">
          {/* Floating active model badge */}
          {(() => {
            const parsed = parseProvider(activeModel)
            if (!parsed) return null
            return (
              <div className="flex justify-center mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/80 backdrop-blur-sm shadow-sm">
                  <span className={`size-1.5 rounded-full ${PROVIDER_DOT[parsed.provider]} ${isStreaming ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
                    Replying with
                  </span>
                  <span className="text-[11px] font-mono text-foreground">
                    {parsed.name}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Composer — elevated with rich focus + streaming pulse */}
          <div
            className={`relative rounded-3xl border bg-card transition-all
              ${isStreaming
                ? 'border-primary/40 shadow-[0_0_0_4px_rgba(0,112,243,0.08),0_4px_24px_-4px_rgba(0,112,243,0.15)]'
                : 'border-border shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_rgba(0,112,243,0.10),0_4px_20px_-4px_rgba(0,0,0,0.12)]'
              }`}
          >
            {/* Subtle gradient ribbon on top edge when streaming */}
            {isStreaming && (
              <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
            )}

            <PromptInput onSubmit={(d) => { handleSubmit(d); setComposerText('') }}>
              <PromptInputBody className="px-2 pt-1">
                <PromptInputTextarea
                  placeholder={isStreaming ? 'Generating response…' : 'Ask anything…'}
                  disabled={isStreaming}
                  value={composerText}
                  onChange={(e) => setComposerText((e.target as HTMLTextAreaElement).value)}
                  onKeyDown={(e) => {
                    // Ctrl/Cmd+Enter inserts a newline instead of sending
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      e.stopPropagation()
                      const textarea = e.currentTarget
                      const start = textarea.selectionStart
                      const end = textarea.selectionEnd
                      const value = textarea.value
                      const next = value.slice(0, start) + '\n' + value.slice(end)
                      setComposerText(next)
                      requestAnimationFrame(() => {
                        textarea.selectionStart = textarea.selectionEnd = start + 1
                      })
                    }
                  }}
                  className="min-h-[64px] text-[15px] px-3 py-3 placeholder:text-muted-foreground/60 leading-relaxed"
                />
              </PromptInputBody>
              <PromptInputFooter className="px-3 pb-3 pt-1 gap-2">
                {/* Left tools cluster */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    title="Attach file (coming soon)"
                    disabled
                    className="inline-flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground/60 hover:text-foreground hover:border-foreground/40 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PaperclipIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsListening((v) => !v)}
                    title={isListening ? 'Listening…' : 'Voice input (coming soon)'}
                    className={`inline-flex items-center justify-center size-8 rounded-full border transition-colors ${
                      isListening
                        ? 'border-red-500/40 bg-red-500/10 text-red-500'
                        : 'border-border text-muted-foreground/60 hover:text-foreground hover:border-foreground/40 hover:bg-muted'
                    }`}
                  >
                    {isListening ? (
                      <span className="relative flex size-2.5">
                        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                        <span className="relative rounded-full size-2.5 bg-red-500" />
                      </span>
                    ) : (
                      <MicIcon className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseRag(!useRag)}
                    aria-pressed={useRag}
                    title={useRag ? 'RAG enabled — agent searches your documents' : 'Enable RAG to search documents'}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium border transition-all ${
                      useRag
                        ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                    }`}
                  >
                    <DatabaseIcon className="size-3" />
                    <span>Search docs</span>
                    {useRag && <span className="size-1 rounded-full bg-primary" />}
                  </button>
                  <div className="h-5 w-px bg-border mx-0.5" />
                  <ModelSelector
                    value={activeModel || undefined}
                    onChange={handleModelChange}
                    disabled={isStreaming}
                  />
                </div>

                {/* Right: char counter + keyboard hint + send */}
                <div className="flex items-center gap-2">
                  {/* Char counter — appears when typing */}
                  {composerText.length >= 80 && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 font-mono tabular-nums">
                      <span className={composerText.length > 4000 ? 'text-amber-500' : ''}>
                        {composerText.length.toLocaleString()}
                      </span>
                      <span className="opacity-50">chars</span>
                    </span>
                  )}
                  {composerText.length < 80 && !isStreaming && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
                      <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px]">↵</kbd>
                      <span>send</span>
                    </span>
                  )}
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={() => stop()}
                      aria-label="Stop generation"
                      className="inline-flex items-center justify-center size-9 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                      {status === 'submitted' ? <Spinner size="sm" /> : <SquareIcon className="size-3.5 fill-current" />}
                    </button>
                  ) : status === 'error' ? (
                    <button
                      type="submit"
                      aria-label="Retry"
                      className="inline-flex items-center justify-center size-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
                    >
                      <XIcon className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      aria-label="Send message"
                      disabled={!composerText.trim()}
                      className={`inline-flex items-center justify-center size-9 rounded-full transition-all shadow-sm ${
                        composerText.trim()
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-[1.04] active:scale-95'
                          : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpIcon className="size-4" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </PromptInputFooter>
            </PromptInput>
          </div>

          {/* Footer hints */}
          <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
            <p className="text-[10px] text-muted-foreground/70 font-mono">
              AI can make mistakes. Verify important info.
            </p>
            <span className="text-muted-foreground/40 text-[10px]">·</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 font-mono">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">⇧↵</kbd>
              <span className="opacity-50">/</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">⌃↵</kbd>
              <span>new line</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 font-mono">
              <span className="text-muted-foreground/40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">K</kbd>
              <span>commands</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
