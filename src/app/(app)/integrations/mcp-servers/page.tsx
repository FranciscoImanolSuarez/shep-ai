'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, PlugIcon, PlusIcon, TrashIcon, PencilIcon } from 'lucide-react'
import type { McpServer, McpTransportType } from '@/core/domain/entities/mcp-server'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { Alert } from '@/components/shared/Alert'
import { Badge } from '@/components/shared/Badge'

interface FormState {
  id?: string
  name: string
  url: string
  transportType: McpTransportType
  authToken: string
  enabled: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  url: '',
  transportType: 'http',
  authToken: '',
  enabled: true,
}

export default function McpServersPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mcp-servers')
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setServers(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MCP servers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const startEdit = (s: McpServer) => {
    setForm({
      id: s.id,
      name: s.name,
      url: s.url,
      transportType: s.transportType,
      authToken: s.authToken ?? '',
      enabled: s.enabled,
    })
    setShowForm(true)
  }

  const cancel = () => {
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  const submit = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = form.id ? `/api/mcp-servers/${form.id}` : '/api/mcp-servers'
      const method = form.id ? 'PATCH' : 'POST'
      const body = {
        name: form.name,
        url: form.url,
        transportType: form.transportType,
        authToken: form.authToken.length > 0 ? form.authToken : null,
        enabled: form.enabled,
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Save failed: ${res.status}`)
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s: McpServer) => {
    if (!confirm(`Delete MCP server "${s.name}"?`)) return
    setError(null)
    try {
      const res = await fetch(`/api/mcp-servers/${s.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="SETUP"
        title="MCP servers"
        description="Connect Model Context Protocol servers so agents can use their tools. Workspace-scoped — opt in per agent via toolIds."
        variant="default"
      />

      <PageBody className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/integrations"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeftIcon className="size-3.5" />
            Integrations
          </Link>
        </div>

        {error && <Alert variant="danger" description={error} />}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${servers.length} server${servers.length === 1 ? '' : 's'} configured`}
          </p>
          {!showForm && (
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="size-3.5" />
              Add server
            </button>
          )}
        </div>

        {showForm && (
          <div className="rounded-xl border border-border p-5 space-y-4 bg-card">
            <h3 className="text-sm font-medium">
              {form.id ? 'Edit MCP server' : 'New MCP server'}
            </h3>
            <div className="grid gap-3">
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm"
                  placeholder="GitHub MCP"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">URL</span>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm font-mono"
                  placeholder="https://your-server.com/mcp"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Transport</span>
                  <select
                    value={form.transportType}
                    onChange={(e) =>
                      setForm({ ...form, transportType: e.target.value as McpTransportType })
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="http">HTTP (recommended)</option>
                    <option value="sse">SSE</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <select
                    value={form.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setForm({ ...form, enabled: e.target.value === 'enabled' })}
                    className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              </div>
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">
                  Auth token <span className="text-muted-foreground/60">(optional, sent as Bearer)</span>
                </span>
                <input
                  type="password"
                  value={form.authToken}
                  onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm font-mono"
                  placeholder="sk-…"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={cancel}
                disabled={saving}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving…' : form.id ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {!loading && servers.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <PlugIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No MCP servers configured yet</p>
            <p className="text-xs text-muted-foreground max-w-md">
              Once you add a server, agents can opt in by including <code className="px-1 py-0.5 rounded bg-muted">mcp:&lt;server-id&gt;</code> in their toolIds.
            </p>
          </div>
        )}

        {!loading && servers.length > 0 && (
          <div className="grid gap-3">
            {servers.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border p-4 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-secondary text-foreground shrink-0">
                      <PlugIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate">{s.name}</h4>
                        <Badge variant={s.enabled ? 'success' : 'muted'}>
                          {s.enabled ? 'enabled' : 'disabled'}
                        </Badge>
                        <Badge variant="muted">{s.transportType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                        {s.url}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Tool id prefix: <code className="font-mono">mcp:{s.id}</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      title="Edit"
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                    >
                      <PencilIcon className="size-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      title="Delete"
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <TrashIcon className="size-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  )
}
