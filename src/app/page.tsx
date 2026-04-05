'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react'

// --- Types ---
interface Doc {
  id: string
  source: string
  createdAt: string
}

interface AgentData {
  id: string
  name: string
  description: string
  systemPrompt: string
  model: string
  provider: 'openai' | 'anthropic' | 'ollama'
  toolIds: string[]
  config: { maxSteps: number; temperature: number; toolChoice: 'auto' | 'required' | 'none' }
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface AgentExecutionData {
  id: string
  agentId: string
  status: 'running' | 'completed' | 'failed'
  steps: Array<{
    stepNumber: number
    text: string
    toolCalls: Array<{ toolName: string; input: Record<string, unknown>; output: unknown }>
    tokensUsed: number
    finishReason: string
  }>
  result?: string
  totalTokens: number
  createdAt: string
  completedAt?: string
}

type Mode = 'chat' | 'documents' | 'agents'

// --- Main ---
export default function Home() {
  const [mode, setMode] = useState<Mode>('chat')
  const [docs, setDocs] = useState<Doc[]>([])
  const [agents, setAgents] = useState<AgentData[]>([])

  function refreshDocs() {
    fetch('/api/rag/documents')
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
  }

  const refreshAgents = useCallback(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
  }, [])

  useEffect(() => {
    refreshDocs()
    refreshAgents()
  }, [refreshAgents])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-[var(--border)] flex flex-col bg-[var(--surface)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-sm font-semibold tracking-tight">Shep AI</h1>
        </div>

        <nav className="flex-1 p-2">
          <SidebarButton
            active={mode === 'chat'}
            onClick={() => setMode('chat')}
            label="Chat"
            description="Free conversation"
          />
          <SidebarButton
            active={mode === 'documents'}
            onClick={() => setMode('documents')}
            label="Documents"
            description={`${docs.length} uploaded`}
          />
          <SidebarButton
            active={mode === 'agents'}
            onClick={() => setMode('agents')}
            label="Agents"
            description={`${agents.length} configured`}
          />
        </nav>

        <div className="p-3 border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--muted)] font-mono">
            Powered by Ollama
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {mode === 'chat' && <ChatView />}
        {mode === 'documents' && (
          <DocumentsView docs={docs} onRefresh={refreshDocs} />
        )}
        {mode === 'agents' && (
          <AgentsView agents={agents} onRefresh={refreshAgents} />
        )}
      </main>
    </div>
  )
}

// --- Sidebar Button ---
function SidebarButton({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  label: string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md mb-0.5 transition-colors ${
        active
          ? 'bg-[var(--foreground)] text-white'
          : 'text-[var(--foreground)] hover:bg-[var(--hover)]'
      }`}
    >
      <span className="text-sm font-medium block">{label}</span>
      <span
        className={`text-[11px] block ${
          active ? 'text-white/60' : 'text-[var(--muted)]'
        }`}
      >
        {description}
      </span>
    </button>
  )
}

// --- Chat View ---
function ChatView() {
  const [input, setInput] = useState('')
  const [useRag, setUseRag] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({
      api: useRag ? '/api/rag/chat' : '/api/chat',
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <>
      {/* Header */}
      <header className="h-12 border-b border-[var(--border)] flex items-center px-4 gap-4 shrink-0 bg-[var(--surface)]">
        <h2 className="text-sm font-medium">Chat</h2>
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
              className="rounded border-[var(--border)] accent-[var(--foreground)]"
            />
            <span className="text-xs text-[var(--muted)]">Use documents</span>
          </label>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center mt-32">
              <p className="text-2xl font-semibold tracking-tight mb-2">
                How can I help?
              </p>
              <p className="text-sm text-[var(--muted)]">
                {useRag
                  ? 'Ask questions about your uploaded documents'
                  : 'Start a free conversation'}
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="mb-6">
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5 ${
                    m.role === 'user'
                      ? 'bg-[var(--foreground)] text-white'
                      : 'bg-[var(--border)] text-[var(--foreground)]'
                  }`}
                >
                  {m.role === 'user' ? 'U' : 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--muted)] mb-1">
                    {m.role === 'user' ? 'You' : 'Shep AI'}
                  </p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {getMessageText(m)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)]">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto px-4 py-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              useRag
                ? 'Ask about your documents...'
                : 'Send a message...'
            }
            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-shadow"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[var(--foreground)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </>
  )
}

// --- Documents View ---
function DocumentsView({
  docs,
  onRefresh,
}: {
  docs: Doc[]
  onRefresh: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (files.length === 0) return
    setUploading(true)
    setUploadStatus(`Uploading ${files.length} document${files.length > 1 ? 's' : ''}...`)

    const documents = await Promise.all(
      files.map(async (file) => ({
        content: await file.text(),
        source: file.name,
        metadata: { type: file.type, size: file.size },
      })),
    )

    const res = await fetch('/api/rag/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents }),
    })

    if (res.ok) {
      setUploadStatus(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`)
      setFiles([])
      onRefresh()
    } else {
      setUploadStatus('Upload failed')
    }
    setUploading(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/rag/documents/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setUploadStatus('')
    }
  }

  return (
    <>
      <header className="h-12 border-b border-[var(--border)] flex items-center px-4 bg-[var(--surface)] shrink-0">
        <h2 className="text-sm font-medium">Documents</h2>
        <span className="text-xs text-[var(--muted)] ml-2">
          {docs.length} uploaded
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--muted)] transition-colors mb-6"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.html,.xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-sm font-medium mb-1">
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                : 'Click to upload documents'}
            </p>
            <p className="text-xs text-[var(--muted)]">
              .txt, .md, .csv, .json, .html, .xml
            </p>
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="mb-6">
              <div className="space-y-1 mb-3">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-[var(--muted)]">
                        {(f.size / 1024).toFixed(1)}kb
                      </span>
                      <span className="text-sm truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={() =>
                        setFiles(files.filter((_, idx) => idx !== i))
                      }
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-[var(--foreground)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity w-full"
              >
                {uploading ? 'Uploading...' : `Upload ${files.length} document${files.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {uploadStatus && (
            <p className="text-xs text-[var(--muted)] mb-4">{uploadStatus}</p>
          )}

          {/* Document list */}
          {docs.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">
                Uploaded Documents
              </h3>
              <div className="space-y-1">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[var(--hover)] group transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{doc.source}</p>
                      <p className="text-[11px] text-[var(--muted)] font-mono">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-xs text-[var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {docs.length === 0 && files.length === 0 && (
            <div className="text-center mt-16">
              <p className="text-sm text-[var(--muted)]">
                No documents yet. Upload files to start using RAG.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// --- Agents View ---
function AgentsView({
  agents,
  onRefresh,
}: {
  agents: AgentData[]
  onRefresh: () => void
}) {
  const [view, setView] = useState<'list' | 'create' | 'run'>('list')
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null)

  function handleCreated() {
    onRefresh()
    setView('list')
  }

  function handleSelectRun(agent: AgentData) {
    setSelectedAgent(agent)
    setView('run')
  }

  async function handleDelete(id: string) {
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <>
      <header className="h-12 border-b border-[var(--border)] flex items-center px-4 bg-[var(--surface)] shrink-0">
        {view === 'list' && (
          <>
            <h2 className="text-sm font-medium">Agents</h2>
            <span className="text-xs text-[var(--muted)] ml-2">
              {agents.length} configured
            </span>
            <button
              onClick={() => setView('create')}
              className="ml-auto bg-[var(--foreground)] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
            >
              New Agent
            </button>
          </>
        )}
        {view === 'create' && (
          <>
            <button
              onClick={() => setView('list')}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] mr-3"
            >
              &larr; Back
            </button>
            <h2 className="text-sm font-medium">Create Agent</h2>
          </>
        )}
        {view === 'run' && selectedAgent && (
          <>
            <button
              onClick={() => { setView('list'); setSelectedAgent(null) }}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] mr-3"
            >
              &larr; Back
            </button>
            <h2 className="text-sm font-medium">{selectedAgent.name}</h2>
            <span className="text-xs text-[var(--muted)] ml-2 font-mono">
              {selectedAgent.provider}/{selectedAgent.model}
            </span>
          </>
        )}
      </header>

      {view === 'list' && (
        <AgentList
          agents={agents}
          onRun={handleSelectRun}
          onDelete={handleDelete}
        />
      )}
      {view === 'create' && <AgentCreateForm onCreated={handleCreated} />}
      {view === 'run' && selectedAgent && (
        <AgentRunView agent={selectedAgent} />
      )}
    </>
  )
}

// --- Agent List ---
function AgentList({
  agents,
  onRun,
  onDelete,
}: {
  agents: AgentData[]
  onRun: (agent: AgentData) => void
  onDelete: (id: string) => void
}) {
  if (agents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight mb-2">No agents yet</p>
          <p className="text-sm text-[var(--muted)]">
            Create an agent to get started with tool-powered conversations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--hover)] transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium">{agent.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--muted)] border border-[var(--border)]">
                    {agent.provider}
                  </span>
                </div>
                {agent.description && (
                  <p className="text-xs text-[var(--muted)] mb-2">{agent.description}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-mono">
                  <span>{agent.model}</span>
                  {agent.toolIds.length > 0 && (
                    <span>{agent.toolIds.length} tool{agent.toolIds.length !== 1 ? 's' : ''}</span>
                  )}
                  <span>max {agent.config.maxSteps} steps</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button
                  onClick={() => onRun(agent)}
                  className="bg-[var(--foreground)] text-white rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Run
                </button>
                <button
                  onClick={() => onDelete(agent.id)}
                  className="text-xs text-[var(--muted)] hover:text-red-500 px-2 py-1.5 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Agent Create Form ---
function AgentCreateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('llama3.1')
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'ollama'>('ollama')
  const [toolIds, setToolIds] = useState<string[]>([])
  const [maxSteps, setMaxSteps] = useState(10)
  const [temperature, setTemperature] = useState(0.7)
  const [saving, setSaving] = useState(false)

  const availableTools = [
    { id: 'rag-search', label: 'RAG Search', description: 'Search uploaded documents' },
    { id: 'get-current-time', label: 'Current Time', description: 'Get current date/time' },
  ]

  const providerModels: Record<string, string[]> = {
    ollama: ['llama3.1', 'llama3.2', 'mistral', 'codellama', 'qwen2.5'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
  }

  function handleProviderChange(p: typeof provider) {
    setProvider(p)
    setModel(providerModels[p][0])
  }

  function toggleTool(id: string) {
    setToolIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)

    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        systemPrompt,
        model,
        provider,
        toolIds,
        config: { maxSteps, temperature, toolChoice: 'auto' },
      }),
    })

    if (res.ok) {
      onCreated()
    }
    setSaving(false)
  }

  const inputClass =
    'w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-shadow'
  const labelClass = 'text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5 block'

  return (
    <div className="flex-1 overflow-y-auto">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Research Assistant"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Instructions for the agent..."
            rows={4}
            className={inputClass + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as typeof provider)}
              className={inputClass}
            >
              <option value="ollama">Ollama (local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            >
              {providerModels[provider].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Tools</label>
          <div className="space-y-1">
            {availableTools.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-[var(--border)] cursor-pointer hover:bg-[var(--hover)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={toolIds.includes(t.id)}
                  onChange={() => toggleTool(t.id)}
                  className="accent-[var(--foreground)]"
                />
                <div>
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-xs text-[var(--muted)] ml-2">{t.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Max Steps</label>
            <input
              type="number"
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              min={1}
              max={50}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Temperature</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              min={0}
              max={2}
              step={0.1}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-[var(--foreground)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity w-full"
        >
          {saving ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  )
}

// --- Agent Run View ---
function AgentRunView({ agent }: { agent: AgentData }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [steps, setSteps] = useState<AgentExecutionData['steps']>([])
  const [isRunning, setIsRunning] = useState(false)
  const [executions, setExecutions] = useState<AgentExecutionData[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/agents/${agent.id}/executions?limit=10`)
      .then((r) => r.json())
      .then((d) => setExecutions(d.executions ?? []))
  }, [agent.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, steps])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || isRunning) return

    const userMsg = { role: 'user' as const, content: input }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')
    setIsRunning(true)
    setSteps([])

    let assistantText = ''

    try {
      const res = await fetch(`/api/agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map((m, i) => ({
            id: String(i),
            role: m.role,
            content: m.content,
            createdAt: new Date().toISOString(),
          })),
        }),
      })

      if (!res.ok) throw new Error('Run failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const events = text.split('\n\n').filter(Boolean)

        for (const event of events) {
          const lines = event.split('\n')
          const eventType = lines[0]?.replace('event:', '')
          const dataLine = lines[1]?.replace('data:', '')

          if (!dataLine) continue

          try {
            const data = JSON.parse(dataLine)

            if (eventType === 'text-delta') {
              assistantText += data.text
              setMessages([...allMessages, { role: 'assistant', content: assistantText }])
            } else if (eventType === 'step-complete') {
              setSteps((prev) => [...prev, data])
            } else if (eventType === 'finish') {
              assistantText = data.text
              setMessages([...allMessages, { role: 'assistant', content: assistantText }])
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      setMessages([
        ...allMessages,
        { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      ])
    }

    setIsRunning(false)
    // Refresh executions
    fetch(`/api/agents/${agent.id}/executions?limit=10`)
      .then((r) => r.json())
      .then((d) => setExecutions(d.executions ?? []))
  }

  return (
    <>
      {/* Messages + Steps */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {messages.length === 0 && !showHistory && (
            <div className="text-center mt-32">
              <p className="text-2xl font-semibold tracking-tight mb-2">
                {agent.name}
              </p>
              <p className="text-sm text-[var(--muted)] mb-1">
                {agent.description || 'Ready to run'}
              </p>
              {agent.toolIds.length > 0 && (
                <p className="text-xs text-[var(--muted)] font-mono">
                  Tools: {agent.toolIds.join(', ')}
                </p>
              )}
              {executions.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] mt-4 underline"
                >
                  View {executions.length} past execution{executions.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {showHistory && messages.length === 0 && (
            <ExecutionHistory executions={executions} onClose={() => setShowHistory(false)} />
          )}

          {messages.map((m, i) => (
            <div key={i} className="mb-6">
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5 ${
                    m.role === 'user'
                      ? 'bg-[var(--foreground)] text-white'
                      : 'bg-[var(--border)] text-[var(--foreground)]'
                  }`}
                >
                  {m.role === 'user' ? 'U' : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--muted)] mb-1">
                    {m.role === 'user' ? 'You' : agent.name}
                  </p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Tool call steps */}
          {steps.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                Tool Calls
              </p>
              <div className="space-y-1.5">
                {steps.map((step) =>
                  step.toolCalls.map((tc, tci) => (
                    <div
                      key={`${step.stepNumber}-${tci}`}
                      className="border border-[var(--border)] rounded-md px-3 py-2 text-xs font-mono bg-[var(--background)]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[var(--foreground)] font-semibold">{tc.toolName}</span>
                        <span className="text-[var(--muted)]">step {step.stepNumber + 1}</span>
                        {step.tokensUsed > 0 && (
                          <span className="text-[var(--muted)]">{step.tokensUsed} tokens</span>
                        )}
                      </div>
                      <details className="text-[var(--muted)]">
                        <summary className="cursor-pointer hover:text-[var(--foreground)] transition-colors">
                          Input/Output
                        </summary>
                        <pre className="mt-1 overflow-x-auto text-[11px] whitespace-pre-wrap">
                          {JSON.stringify({ input: tc.input, output: tc.output }, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )),
                )}
              </div>
            </div>
          )}

          {isRunning && steps.length === 0 && messages[messages.length - 1]?.role === 'user' && (
            <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className="inline-block w-4 h-4 border-2 border-[var(--muted)]/30 border-t-[var(--muted)] rounded-full animate-spin" />
              Thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)]">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto px-4 py-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-shadow"
            disabled={isRunning}
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className="bg-[var(--foreground)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isRunning ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Run'
            )}
          </button>
        </form>
      </div>
    </>
  )
}

// --- Execution History ---
function ExecutionHistory({
  executions,
  onClose,
}: {
  executions: AgentExecutionData[]
  onClose: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
          Execution History
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Close
        </button>
      </div>
      <div className="space-y-2">
        {executions.map((exec) => (
          <details
            key={exec.id}
            className="border border-[var(--border)] rounded-lg overflow-hidden"
          >
            <summary className="px-4 py-3 cursor-pointer hover:bg-[var(--hover)] transition-colors">
              <div className="inline-flex items-center gap-3">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    exec.status === 'completed'
                      ? 'bg-green-500'
                      : exec.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                  }`}
                />
                <span className="text-sm">{exec.status}</span>
                <span className="text-xs text-[var(--muted)] font-mono">
                  {new Date(exec.createdAt).toLocaleString()}
                </span>
                <span className="text-xs text-[var(--muted)] font-mono">
                  {exec.totalTokens} tokens
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {exec.steps.length} step{exec.steps.length !== 1 ? 's' : ''}
                </span>
              </div>
            </summary>
            <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--background)]">
              {exec.result && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-[var(--muted)] mb-1">Result</p>
                  <p className="text-sm whitespace-pre-wrap">{exec.result}</p>
                </div>
              )}
              {exec.steps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--muted)] mb-1">Steps</p>
                  <div className="space-y-1">
                    {exec.steps.map((step) => (
                      <div key={step.stepNumber} className="text-xs font-mono text-[var(--muted)]">
                        <span>Step {step.stepNumber + 1}: </span>
                        {step.toolCalls.length > 0 ? (
                          <span>
                            {step.toolCalls.map((tc) => tc.toolName).join(', ')}
                          </span>
                        ) : (
                          <span>{step.finishReason}</span>
                        )}
                        <span className="ml-2">{step.tokensUsed} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

// --- Helpers ---
function getMessageText(message: {
  parts: Array<{ type: string; text?: string }>
}): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('')
}
