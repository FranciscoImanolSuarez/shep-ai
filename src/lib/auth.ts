import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: 'RefreshTokenError'
  }
}

// JWT token properties are accessed via Record<string, unknown> indexing
// since pnpm strict mode prevents module augmentation of transitive deps

const config: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens from Google
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }

      // Token still valid
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token
      }

      // Token expired — refresh it
      if (!token.refreshToken) {
        return { ...token, error: 'RefreshTokenError' as const }
      }

      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
        })

        const refreshed = await response.json()

        if (!response.ok) throw refreshed

        return {
          ...token,
          accessToken: refreshed.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + refreshed.expires_in),
          // Google may or may not return a new refresh token
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
        }
      } catch {
        return { ...token, error: 'RefreshTokenError' as const }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.error = token.error as 'RefreshTokenError' | undefined
      // Expose user email as stable ID for conversation ownership
      if (token.email) {
        session.user.email = token.email as string
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
