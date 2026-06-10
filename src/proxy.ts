import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NextAuth v5 (authjs) session cookie names
// Development: authjs.session-token
// Production (HTTPS): __Secure-authjs.session-token
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionToken =
    request.cookies.get('__Secure-authjs.session-token')?.value ??
    request.cookies.get('authjs.session-token')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (auth page)
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, /sitemap.xml, /robots.txt (metadata files)
     * - static asset extensions (.png, .svg, .jpg, .ico, .webp)
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|svg|jpg|jpeg|ico|webp)$).*)',
  ],
}
