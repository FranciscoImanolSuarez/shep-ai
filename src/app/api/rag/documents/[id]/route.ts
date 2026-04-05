import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { ragUseCase } = getContainer()

  await ragUseCase.deleteDocument(id)

  return NextResponse.json({ success: true })
}
