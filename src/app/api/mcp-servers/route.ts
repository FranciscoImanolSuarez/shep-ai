import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getActiveWorkspaceContext } from '@/lib/workspace-context'
import { getContainer } from '@/config/container'
import type { McpTransportType } from '@/core/domain/entities/mcp-server'

export async function GET() {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { mcpServerStore } = getContainer()
  const servers = await mcpServerStore.findByWorkspace(ctx.workspace.id)
  return NextResponse.json(servers)
}

export async function POST(req: Request) {
  const ctx = await getActiveWorkspaceContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    name?: unknown
    url?: unknown
    transportType?: unknown
    authToken?: unknown
    enabled?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  const transport = body.transportType
  if (transport !== 'http' && transport !== 'sse') {
    return NextResponse.json({ error: 'transportType must be "http" or "sse"' }, { status: 400 })
  }

  const { mcpServerStore } = getContainer()
  const now = new Date()
  const server = await mcpServerStore.save({
    id: randomUUID(),
    workspaceId: ctx.workspace.id,
    name: body.name.trim(),
    transportType: transport as McpTransportType,
    url: body.url.trim(),
    authToken: typeof body.authToken === 'string' && body.authToken.length > 0 ? body.authToken : null,
    enabled: body.enabled !== false,
    createdAt: now,
    updatedAt: now,
  })
  return NextResponse.json(server, { status: 201 })
}
