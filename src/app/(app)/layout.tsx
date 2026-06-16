import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { getEnv } from '@/config/env'
import { Toaster } from '@/components/shared/Toast'
import { CommandPaletteLazy } from '@/components/shared/CommandPaletteLazy'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Defensive guard — proxy.ts handles this first, but this prevents
  // rendering if proxy is misconfigured
  if (!session?.user) {
    redirect('/login')
  }

  const { WORKSPACES_ENABLED } = getEnv()

  return (
    <div className="flex h-screen">
      <AppSidebar user={session.user} workspacesEnabled={WORKSPACES_ENABLED} />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </main>
      <Toaster />
      <CommandPaletteLazy />
    </div>
  )
}
