import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { ExportOwnershipError } from '@/core/usecases/export.usecase'
import type { ExportFormat } from '@/core/ports/out/exporter.port'

interface RouteParams {
  params: Promise<{ id: string }>
}

const VALID_FORMATS: ExportFormat[] = ['md', 'pdf', 'json']

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get('format') as ExportFormat | null

  if (!format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: 'Unsupported format. Use md, pdf, or json.' },
      { status: 400 },
    )
  }

  const { id } = await params
  const { exportUseCase } = getContainer()

  try {
    const { data, mimeType, extension, slug } = await exportUseCase.exportOne({
      userId: session.user.email,
      conversationId: id,
      format,
    })

    // Web Response BodyInit accepts string, ArrayBuffer, or Uint8Array — not Node Buffer directly.
    const body = typeof data === 'string' ? data : new Uint8Array(data)

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${slug}.${extension}"`,
      },
    })
  } catch (err) {
    if (err instanceof ExportOwnershipError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    throw err
  }
}
