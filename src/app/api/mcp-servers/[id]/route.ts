import { NextResponse } from 'next/server'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { mcpServerStore } = getContainer()
  const server = await mcpServerStore.findById(id)
  if (!server || server.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(server)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { mcpServerStore } = getContainer()
  const existing = await mcpServerStore.findById(id)
  if (!existing || existing.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown
    url?: unknown
    transportType?: unknown
    authToken?: unknown
    enabled?: unknown
  }

  const updated = await mcpServerStore.update(id, {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    url: typeof body.url === 'string' ? body.url.trim() : undefined,
    transportType:
      body.transportType === 'http' || body.transportType === 'sse' ? body.transportType : undefined,
    // Allow null to clear the token
    authToken:
      typeof body.authToken === 'string'
        ? body.authToken
        : body.authToken === null
          ? null
          : undefined,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { mcpServerStore } = getContainer()
  const existing = await mcpServerStore.findById(id)
  if (!existing || existing.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await mcpServerStore.delete(id)
  return NextResponse.json({ ok: true })
}
