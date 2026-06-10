import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getContainer } from '@/config/container'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import type { AuditAggregateResult } from '@/core/ports/out/audit-store.port'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const now = new Date()
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let initial: AuditAggregateResult | null = null
  try {
    const { auditStore } = getContainer()
    initial = await auditStore.aggregate(session.user.email, { from, to: now }, 'day')
  } catch {
    // Non-fatal — dashboard handles null gracefully
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Hero
        eyebrow="INSIGHTS"
        title="Analytics"
        description="Monitor usage, costs, and performance across your agents and workflows."
        variant="default"
      />
      <PageBody className="space-y-6">
        <AnalyticsDashboard initial={initial} />
      </PageBody>
    </div>
  )
}
