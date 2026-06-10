import { Inngest } from 'inngest'
import type { WorkflowDefinition } from '@/core/domain/entities/workflow-definition'

/**
 * P2.2 — Inngest client. Setup config:
 *  - Dev: run `npx inngest-cli dev` in a separate terminal; INNGEST_EVENT_KEY/SIGNING_KEY are unused.
 *  - Prod: set `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` from Inngest Cloud dashboard.
 *
 * Inngest v4 derives event types per-function at `createFunction` time, not via
 * the client constructor. We export an explicit `WorkflowExecuteRequestedData`
 * type so the function handler can cast `event.data` to the right shape.
 */
export interface WorkflowExecuteRequestedData {
  runId: string
  workspaceId: string
  userId?: string
  workflowId: string
  snapshot: WorkflowDefinition
  input: Record<string, unknown>
}

export const WORKFLOW_EXECUTE_REQUESTED = 'workflow/execute.requested' as const

export const inngest = new Inngest({ id: 'shep-ai' })
