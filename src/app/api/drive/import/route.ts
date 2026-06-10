import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

// Approximate chunk count per document (512 char chunks, 50 overlap)
function estimateChunkCount(content: string): number {
  return Math.ceil(content.length / 462)
}

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated with Google' },
      { status: 401 },
    )
  }

  const body = (await req.json()) as { fileIds: string[]; knowledgeBaseId?: string }
  const { fileIds, knowledgeBaseId } = body

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return NextResponse.json(
      { error: 'fileIds array is required' },
      { status: 400 },
    )
  }

  if (!knowledgeBaseId) {
    return NextResponse.json(
      { error: 'knowledgeBaseId is required' },
      { status: 400 },
    )
  }

  const { ragUseCase, fileSource, auditStore, knowledgeBaseUseCase } = getContainer()

  // Verify ownership
  const kb = await knowledgeBaseUseCase.get(session.user!.email!, knowledgeBaseId)
  if (!kb) {
    return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
  }

  try {
    const files = await fileSource.fetchFilesContent(
      fileIds,
      session.accessToken,
    )

    const documents = await Promise.all(
      files.map(async (file) => {
        const doc = await ragUseCase.ingest({
          content: file.content,
          source: `gdrive://${file.fileName}`,
          knowledgeBaseId,
          metadata: {
            driveFileId: file.externalId,
            driveSource: true,
            originalMimeType: file.mimeType,
            importedAt: new Date().toISOString(),
          },
        })
        void auditStore.record({
          userId: session.user!.email!,
          eventType: 'document_upload',
          metadata: { source: 'drive', chunkCount: estimateChunkCount(file.content) },
          tokenCount: 0,
        }).catch((err: unknown) => console.error('audit failed', err))
        return doc
      }),
    )

    return NextResponse.json({ documents })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to import from Drive'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
