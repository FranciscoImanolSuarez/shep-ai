import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET() {
  const { ragUseCase } = getContainer()
  const docs = await ragUseCase.listDocuments()
  return NextResponse.json({ documents: docs })
}
