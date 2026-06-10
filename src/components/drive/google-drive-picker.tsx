'use client'

import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import dynamic from 'next/dynamic'

const DrivePicker = dynamic(
  () =>
    import('@googleworkspace/drive-picker-react').then(
      (mod) => mod.DrivePicker,
    ),
  { ssr: false },
)

const DrivePickerDocsView = dynamic(
  () =>
    import('@googleworkspace/drive-picker-react').then(
      (mod) => mod.DrivePickerDocsView,
    ),
  { ssr: false },
)

interface GoogleDrivePickerProps {
  onImportComplete: () => void
  knowledgeBaseId?: string | null
}

interface PickerDoc {
  id: string
  name: string
  mimeType: string
}

export function GoogleDrivePicker({
  onImportComplete,
  knowledgeBaseId,
}: GoogleDrivePickerProps) {
  const { data: session } = useSession()
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? ''
  const developerKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''

  async function handlePicked(e: CustomEvent) {
    const docs = (e.detail?.docs ?? []) as PickerDoc[]

    if (docs.length === 0) return

    setImporting(true)
    setError(null)

    try {
      const res = await fetch('/api/drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: docs.map((d) => d.id), knowledgeBaseId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Import failed')
      }

      onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      setPickerVisible(false)
    }
  }

  if (!clientId) return null

  return (
    <div>
      <button
        onClick={() => {
          if (!session?.accessToken) {
            signIn('google')
            return
          }
          setPickerVisible(true)
        }}
        disabled={importing}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 w-full justify-center"
      >
        <GoogleDriveIcon />
        {importing ? 'Importing...' : 'Import from Google Drive'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {pickerVisible && (
        <DrivePicker
          client-id={clientId}
          app-id={appId}
          developer-key={developerKey}
          oauth-token={session?.accessToken}
          multiselect={true}
          scope="https://www.googleapis.com/auth/drive.readonly"
          title="Select files to import"
          onPicked={handlePicked}
          onCanceled={() => setPickerVisible(false)}
        >
          <DrivePickerDocsView
            mime-types="text/plain,text/markdown,text/csv,text/html,text/xml,application/json,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,application/vnd.google-apps.presentation"
          />
        </DrivePicker>
      )}
    </div>
  )
}

function GoogleDriveIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l11.752 23.8z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}
