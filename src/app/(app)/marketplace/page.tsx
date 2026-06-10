import { getContainer } from '@/config/container'
import { MarketplaceCatalog } from '@/components/marketplace/marketplace-catalog'

export default async function MarketplacePage() {
  const { marketplaceUseCase } = getContainer()
  const agents = await marketplaceUseCase.browse({ limit: 30 })

  return (
    <div className="flex flex-col h-full">
      <MarketplaceCatalog initialAgents={agents} />
    </div>
  )
}
