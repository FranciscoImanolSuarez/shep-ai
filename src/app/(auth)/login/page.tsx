'use client'

import { useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(callbackUrl)
    }
  }, [session, status, router, callbackUrl])

  if (status === 'loading' || (status === 'authenticated' && session)) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex gap-1">
          <div className="size-2 rounded-full bg-foreground/20 animate-pulse" />
          <div className="size-2 rounded-full bg-foreground/20 animate-pulse [animation-delay:150ms]" />
          <div className="size-2 rounded-full bg-foreground/20 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm px-4">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <div className="size-10 rounded-xl bg-foreground flex items-center justify-center">
          <span className="text-sm font-bold text-background">S</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 space-y-6 shadow-sm">
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Sign in to Shep AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Continue with your Google account
          </p>
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm font-medium text-foreground"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          By continuing, you agree to our Terms of Service.
          <br />
          Drive access is optional and managed in Settings.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
