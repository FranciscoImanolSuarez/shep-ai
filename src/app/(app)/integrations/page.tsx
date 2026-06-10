'use client'

import { useSession, signIn } from 'next-auth/react'
import { HardDriveIcon, CheckCircleIcon, ExternalLinkIcon } from 'lucide-react'
import { PageBody } from '@/components/shared/PageHeader'
import { Hero } from '@/components/shared/Hero'
import { Banner } from '@/components/shared/Banner'
import { Badge } from '@/components/shared/Badge'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  onConnect: () => void
  permissions: string
}

export default function IntegrationsPage() {
  const { data: session } = useSession()

  const isDriveConnected = !!session?.accessToken

  const integrations: Integration[] = [
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Import documents from Google Drive into your knowledge base for RAG-powered conversations.',
      icon: <HardDriveIcon className="size-5" />,
      connected: isDriveConnected,
      onConnect: () => signIn('google', { callbackUrl: '/integrations' }),
      permissions: 'Read-only access to your Google Drive files. We only access files you explicitly select.',
    },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="SETUP"
        title="Integrations"
        description="Connect external tools and data sources to power your agents."
        variant="default"
      />

      <PageBody className="space-y-6">
        <Banner
          variant="info"
          title="Connect your tools"
          description="Integrations let agents read from external sources like Google Drive. More integrations are on the way."
        />
        <div className="grid gap-4 max-w-2xl">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-xl border border-border p-5 space-y-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-secondary text-foreground">
                    {integration.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{integration.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {integration.description}
                    </p>
                  </div>
                </div>

                {integration.connected ? (
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <Badge variant="success">
                      <CheckCircleIcon className="size-2.5 mr-0.5" />
                      Connected
                    </Badge>
                  </span>
                ) : (
                  <button
                    onClick={integration.onConnect}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
                  >
                    Connect
                    <ExternalLinkIcon className="size-3" />
                  </button>
                )}
              </div>

              <div className="rounded-md bg-secondary/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Permissions: </span>
                  {integration.permissions}
                </p>
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </div>
  )
}
