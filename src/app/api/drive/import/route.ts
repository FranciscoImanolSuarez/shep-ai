import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'

// Approximate chunk count per document (512 char chunks, 50 overlap)
function estimateChunkCount(content: string): number {
  return Math.ceil(content.length / 462)
}

const importSchema = z.object({
  fileIds: z.array(z.string()).min(1),
  knowledgeBaseId: z.string().min(1),
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
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { fileIds, knowledgeBaseId } = parsed.data

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
