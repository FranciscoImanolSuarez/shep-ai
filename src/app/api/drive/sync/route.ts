import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

const syncSchema = z.object({
  documentId: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated with Google' },
      { status: 401 },
    )
  }

  const body = await req.json()
  const parsed = syncSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { documentId } = parsed.data

  const { ragUseCase, fileSource } = getContainer()

  // Look up the existing document to get the Drive file ID
  const doc = await ragUseCase.getDocument(documentId)

  if (!doc) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 },
    )
  }

  const driveFileId = doc.metadata?.driveFileId as string | undefined

  if (!driveFileId) {
    return NextResponse.json(
      { error: 'Document is not from Google Drive' },
      { status: 400 },
    )
  }

  if (!doc.knowledgeBaseId) {
    return NextResponse.json(
      { error: 'Document has no knowledge base; re-import it instead' },
      { status: 400 },
    )
  }

  try {
    // Delete old document and re-ingest
    await ragUseCase.deleteDocument(documentId)

    const file = await fileSource.fetchFileContent(
      driveFileId,
      session.accessToken,
    )

    const newDocument = await ragUseCase.ingest({
      content: file.content,
      source: `gdrive://${file.fileName}`,
      knowledgeBaseId: doc.knowledgeBaseId,
      metadata: {
        driveFileId: file.externalId,
        driveSource: true,
        originalMimeType: file.mimeType,
        importedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ document: newDocument })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to sync from Drive'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
