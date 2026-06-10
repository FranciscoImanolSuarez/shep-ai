import { redirect } from 'next/navigation'

// Root route redirects to /dashboard.
// proxy.ts handles auth gate: unauthenticated users are redirected to /login first.
export default function RootPage() {
  redirect('/dashboard')
}
