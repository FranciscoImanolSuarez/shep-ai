import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getActiveWorkspaceContext()
  const { toolRegistry, mcpServerStore } = getContainer()

  const tools = toolRegistry
    .getAll()
    .filter((t) => t.id !== 'delegate-agent')
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
    }))

  const mcpServers = ctx
    ? (await mcpServerStore.findByWorkspace(ctx.workspace.id))
        .filter((s) => s.enabled)
        .map((s) => ({ id: s.id, name: s.name }))
    : []

  return NextResponse.json({ tools, mcpServers })
}
