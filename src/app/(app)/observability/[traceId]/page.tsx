import { notFound, redirect } from 'next/navigation'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import { TraceDetailClient } from './_client'

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ traceId: string }>
}) {
  const { traceId } = await params

  const ctx = await getActiveWorkspaceContext()
  if (!ctx) redirect('/login')

  const { observabilityUseCase } = getContainer()
  const result = await observabilityUseCase.getTrace(ctx.workspace.id, traceId)

  if (!result) notFound()

  return <TraceDetailClient initialTrace={result.trace} initialSpans={result.spans} />
}
