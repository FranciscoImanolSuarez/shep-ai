'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrashIcon,
  FileTextIcon,
  RefreshCwIcon,
  FileJsonIcon,
  FileCodeIcon,
  ArrowLeftIcon,
} from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { GoogleDrivePicker } from '@/components/drive/google-drive-picker'
import { PageHeader, PageBody } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileUpload } from '@/components/shared/forms/FileUpload'
import { Alert } from '@/components/shared/Alert'
import { toast } from '@/components/shared/Toast'

interface KnowledgeBase {
  id: string
  name: string
  description: string
  createdAt: string
}

interface Doc {
  id: string
  source: string
  metadata: Record<string, unknown>
  createdAt: string
  knowledgeBaseId?: string | null
  content?: string
}

interface KbStats {
  docCount: number
  estimatedTokens: number
  lastIngestedAt: string | null
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default function KnowledgeBaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [stats, setStats] = useState<KbStats | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/knowledge-bases/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/knowledge-bases/${id}/documents`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/knowledge-bases/${id}/stats`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([kbData, docsData, statsData]) => {
        if (!kbData) {
          setNotFound(true)
          return
        }
        setKb(kbData.knowledgeBase ?? kbData)
        setDocs(docsData?.documents ?? [])
        setStats(statsData ?? null)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  async function handleFiles(files: File[]) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    try {
      const uploads = files.map(async (file) => {
        const content = await file.text()
        return { content, source: file.name, metadata: { originalName: file.name, size: file.size, type: file.type } }
      })

      const documents = await Promise.all(uploads)
      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, knowledgeBaseId: id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Upload failed')
      }
      toast.success(`${files.length} document${files.length !== 1 ? 's' : ''} uploaded`)
      refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      toast.error(`Upload failed: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(docId: string) {
    await fetch(`/api/rag/documents/${docId}`, { method: 'DELETE' })
    setDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  async function syncDoc(docId: string) {
    await fetch('/api/drive/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId }),
    })
    refresh()
  }

  if (notFound) {
    return (
      <div className="flex-1 overflow-auto">
        <PageHeader title="Knowledge base not found" />
        <PageBody>
          <EmptyState
            icon={FileTextIcon}
            title="This knowledge base doesn't exist"
            description="It may have been deleted, or you don't have access to it."
            action={
              <Link
                href="/knowledge-bases"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
              >
                Back to knowledge bases
              </Link>
            }
          />
        </PageBody>
      </div>
    )
  }

  const breadcrumb = (
    <button
      onClick={() => router.push('/knowledge-bases')}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeftIcon className="size-3" />
      All knowledge bases
    </button>
  )

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title={kb?.name ?? (loading ? 'Loading…' : 'Knowledge base')}
        description={kb?.description || 'Documents in this knowledge base power RAG queries from agents.'}
        breadcrumb={breadcrumb}
      />

      <PageBody className="space-y-6">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documents</p>
              <p className="text-xl font-semibold tabular-nums mt-1">{stats.docCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tokens</p>
              <p className="text-xl font-semibold tabular-nums mt-1">~{formatTokens(stats.estimatedTokens)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Last upload</p>
              <p className="text-sm font-medium mt-1">
                {stats.lastIngestedAt
                  ? new Date(stats.lastIngestedAt).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <Alert variant="danger" description={error} onDismiss={() => setError(null)} />
        )}

        {/* Upload area */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Upload documents</h2>
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
          <h2 className="text-sm font-semibold">Import from Google Drive</h2>
          {session?.accessToken ? (
            <GoogleDrivePicker onImportComplete={refresh} knowledgeBaseId={id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/integrations" className="text-primary underline underline-offset-4 hover:opacity-80">
                Connect Google Drive
              </Link>{' '}
              to import files directly into this knowledge base.
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
              description="Upload your first file above to start populating this knowledge base."
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
