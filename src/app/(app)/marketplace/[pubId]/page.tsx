import { notFound } from 'next/navigation'
import { getContainer } from '@/config/container'
import { MarketplaceDetailClient } from './_client'

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ pubId: string }>
}) {
  const { pubId } = await params

  const { marketplaceUseCase } = getContainer()
  const agent = await marketplaceUseCase.getDetail(pubId)

  if (!agent) notFound()

  return <MarketplaceDetailClient initialAgent={agent} pubId={pubId} />
}
