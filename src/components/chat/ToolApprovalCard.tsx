'use client'

import { useState } from 'react'
import { ShieldAlertIcon, CheckIcon, XIcon } from 'lucide-react'

/**
 * P1.1 — Renders a `tool-*` UIMessage part whose `state === 'approval-requested'`.
 *
 * The chat surface drops one of these in line BEFORE the assistant text whenever
 * a tool with `needsApproval` paused mid-loop. The user clicks Approve or Deny,
 * and we call `useChat`'s `addToolApprovalResponse` with the approval id — the
 * SDK then resumes the stream automatically.
 */
interface ToolApprovalPart {
  type: string
  state: 'approval-requested'
  input: unknown
  approval: { id: string }
}

interface ToolApprovalCardProps {
  part: ToolApprovalPart
  onRespond: (input: {
    id: string
    approved: boolean
    reason?: string
  }) => void | PromiseLike<void>
}

export function ToolApprovalCard({ part, onRespond }: ToolApprovalCardProps) {
  const [busy, setBusy] = useState(false)
  // Tool name lives in the part type, e.g. "tool-rag-search". Strip the prefix
  // for display — the underlying SDK part shape is stable across versions.
  const toolName = part.type.startsWith('tool-') ? part.type.slice('tool-'.length) : part.type

  const respond = async (approved: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      await onRespond({ id: part.approval.id, approved })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 my-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50">
          <ShieldAlertIcon className="size-4 text-amber-700 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Approval required</h4>
            <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">
              {toolName}
            </code>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            The agent wants to invoke this tool. Review the input before approving.
          </p>
          <details className="mt-2 group">
            <summary className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
              Show input
            </summary>
            <pre className="mt-2 text-[11px] font-mono p-2 rounded bg-background border border-border max-h-48 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </details>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          onClick={() => respond(false)}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
        >
          <XIcon className="size-3" />
          Deny
        </button>
        <button
          onClick={() => respond(true)}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <CheckIcon className="size-3" />
          Approve
        </button>
      </div>
    </div>
  )
}
