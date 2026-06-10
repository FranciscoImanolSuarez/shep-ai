'use client'

import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExternalLinkIcon,
  LogOutIcon,
  HardDriveIcon,
  UserIcon,
} from 'lucide-react'
import { Hero } from '@/components/shared/Hero'
import { PageBody } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()

  const isDriveConnected = !!session?.accessToken
  const user = session?.user

  return (
    <div className="flex-1 overflow-auto">
      <Hero
        eyebrow="ACCOUNT"
        title="Settings"
        description="Manage your profile, connected services, and account preferences."
        variant="default"
      />

      <PageBody className="space-y-8 max-w-2xl">
        {/* Profile */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <SectionHeader
            title="Profile"
            description="Your account details from Google."
          />
          <div className="flex items-center gap-4">
            {user?.image ? (
              <Image
                src={user.image}
                alt=""
                width={48}
                height={48}
                className="size-12 rounded-full shrink-0"
              />
            ) : (
              <span className="size-12 rounded-full bg-secondary text-foreground flex items-center justify-center text-base font-medium shrink-0">
                <UserIcon className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              {user?.name && (
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name}
                </p>
              )}
              {user?.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Profile information is managed by your Google account.
          </p>
        </div>

        {/* Google Drive */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <SectionHeader
            title="Google Drive"
            description="Allow Shep AI to import documents from your Drive into knowledge bases."
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary text-foreground shrink-0">
                <HardDriveIcon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google Drive access</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Read-only access to files you explicitly select
                </p>
              </div>
            </div>

            {isDriveConnected ? (
              <Badge variant="success">
                <CheckCircleIcon className="size-2.5 mr-0.5" />
                Connected
              </Badge>
            ) : (
              <Badge variant="warning">
                <XCircleIcon className="size-2.5 mr-0.5" />
                Not connected
              </Badge>
            )}
          </div>

          {!isDriveConnected && (
            <button
              onClick={() => signIn('google', { callbackUrl: '/settings' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Connect Google Drive
              <ExternalLinkIcon className="size-3" />
            </button>
          )}

          <div className="rounded-md bg-secondary/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Revoking access: </span>
              To remove Drive access, visit{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Google Account Permissions
              </a>{' '}
              and revoke Shep AI.
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 p-5 space-y-4">
          <SectionHeader
            title="Danger zone"
            description="Irreversible account actions."
          />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You will be redirected to the login page.
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOutIcon className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </PageBody>
    </div>
  )
}
