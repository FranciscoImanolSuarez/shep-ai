import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { ExportOwnershipError } from '@/core/usecases/export.usecase'
import type { ExportFormat } from '@/core/ports/out/exporter.port'

const VALID_FORMATS: ExportFormat[] = ['md', 'pdf', 'json']

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { ids, format } = body as { ids?: unknown; format?: unknown }

  if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
    return NextResponse.json(
      { error: 'Unsupported format. Use md, pdf, or json.' },
      { status: 400 },
    )
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'ids must be a non-empty array of conversation IDs.' },
      { status: 400 },
    )
  }

  const { exportUseCase } = getContainer()

  try {
    const zipBuffer = await exportUseCase.exportBatch({
      userId: session.user.email,
      conversationIds: ids as string[],
      format: format as ExportFormat,
    })

    const timestamp = Date.now()

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="conversations-${timestamp}.zip"`,
      },
    })
  } catch (err) {
    if (err instanceof ExportOwnershipError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    throw err
  }
}
