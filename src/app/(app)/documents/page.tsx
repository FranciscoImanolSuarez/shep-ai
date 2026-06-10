'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { TrashIcon, FileTextIcon, RefreshCwIcon, FileJsonIcon, FileCodeIcon } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { GoogleDrivePicker } from '@/components/drive/google-drive-picker'
import { KnowledgeBaseSelector } from '@/components/knowledge-bases/KnowledgeBaseSelector'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileUpload } from '@/components/shared/forms/FileUpload'
import { toast } from '@/components/shared/Toast'

interface Doc {
  id: string
  source: string
  metadata: Record<string, unknown>
  createdAt: string
  knowledgeBaseId?: string | null
  content?: string
}

function sourceLabel(source: string): { label: string; variant: 'info' | 'muted' } {
  if (source.startsWith('gdrive://')) return { label: 'Drive', variant: 'info' }
  if (source.startsWith('http://') || source.startsWith('https://')) return { label: 'URL', variant: 'muted' }
  return { label: 'Upload', variant: 'muted' }
}

function estimateTokens(content: string): string {
  const n = Math.round((content?.length ?? 0) / 4)
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}k tokens`
  return `~${n} tokens`
}

function docFileName(source: string): string {
  if (source.startsWith('gdrive://')) {
    const parts = source.split('/')
    return parts[parts.length - 1] || source
  }
  try {
    const url = new URL(source)
    return url.pathname.split('/').filter(Boolean).pop() || url.hostname
  } catch {
    return source
  }
}

export default function DocumentsPage() {
  const { data: session } = useSession()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedKb, setSelectedKb] = useState<string | null>(null)

  const refreshDocs = useCallback(() => {
    setLoading(true)
    const url = selectedKb
      ? `/api/knowledge-bases/${selectedKb}/documents`
      : '/api/rag/documents'
    fetch(url)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .finally(() => setLoading(false))
  }, [selectedKb])

  useEffect(() => { refreshDocs() }, [refreshDocs])

  async function handleFiles(files: File[]) {
    if (!files || files.length === 0) return
    if (!selectedKb) {
      toast.error('Please select a knowledge base before uploading')
      return
    }
    setUploading(true)

    try {
      const uploads = files.map(async (file) => {
        const content = await file.text()
        return { content, source: file.name, metadata: { originalName: file.name, size: file.size, type: file.type } }
      })

      const documents = await Promise.all(uploads)
      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, knowledgeBaseId: selectedKb }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Upload failed')
      }
      toast.success(`${files.length} document${files.length !== 1 ? 's' : ''} uploaded`)
      refreshDocs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/rag/documents/${id}`, { method: 'DELETE' })
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  async function syncDoc(id: string) {
    await fetch('/api/drive/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: id }),
    })
    refreshDocs()
  }

  const kbFilter = (
    <KnowledgeBaseSelector
      value={selectedKb}
      onChange={setSelectedKb}
      includeAll
      placeholder="All knowledge bases"
    />
  )

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="KNOWLEDGE"
        title="Documents"
        description="Upload and manage documents across your knowledge bases."
        variant="default"
        actions={kbFilter}
        stats={docs.length > 0 ? [{ label: 'Documents', value: docs.length }] : undefined}
      />

      <PageBody className="space-y-6">
        {/* Upload area */}
        <div className="space-y-2">
          {uploading && (
            <p className="text-xs text-muted-foreground">Uploading…</p>
          )}
          <FileUpload
            onFiles={handleFiles}
            accept=".txt,.md,.csv,.json,.xml,.html"
            multiple
          />
        </div>

        {/* Google Drive import */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <h2 className="text-sm font-semibold">Google Drive</h2>
          {session?.accessToken ? (
            <GoogleDrivePicker onImportComplete={refreshDocs} knowledgeBaseId={selectedKb} />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/integrations" className="text-primary underline underline-offset-4 hover:opacity-80">
                Connect Google Drive
              </Link>{' '}
              to import files directly.
            </p>
          )}
        </div>

        {/* Document list */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {docs.length} document{docs.length !== 1 ? 's' : ''}
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={FileTextIcon}
              title="No documents yet"
              description="Upload files or import from Google Drive to get started."
            />
          ) : (
            docs.map((doc) => {
              const isDrive = doc.source.startsWith('gdrive://')
              const src = sourceLabel(doc.source)
              const fileName = docFileName(doc.source)
              const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
              const DocIcon =
                ['json'].includes(ext) ? FileJsonIcon :
                ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rb'].includes(ext) ? FileCodeIcon :
                FileTextIcon
              const sizeStr = doc.metadata?.size != null
                ? `${Math.round(Number(doc.metadata.size) / 1024)} KB`
                : null
              const tokenStr = doc.content ? estimateTokens(doc.content) : null

              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-accent/50 hover:border-foreground/20 transition-colors"
                >
                  <DocIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm truncate font-medium">{fileName}</p>
                      <Badge variant={src.variant} className="shrink-0">{src.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      {sizeStr && <><span>·</span><span>{sizeStr}</span></>}
                      {tokenStr && <><span>·</span><span>{tokenStr}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isDrive && (
                      <button
                        onClick={() => syncDoc(doc.id)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Sync from Drive"
                      >
                        <RefreshCwIcon className="size-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PageBody>
    </div>
  )
}
