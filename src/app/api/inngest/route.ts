import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { workflowRunner } from '@/lib/inngest/functions/workflow-runner'

/**
 * P2.2 — Inngest webhook endpoint.
 *
 * Dev: run `npx inngest-cli dev` in a separate terminal — it auto-discovers
 * this endpoint at http://localhost:3000/api/inngest and routes events there.
 *
 * Prod: configure your Inngest Cloud app to point at this endpoint; set
 * INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in the environment.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [workflowRunner],
})
