import type {
  FileSourcePort,
  FileSourceContent,
} from '@/core/ports/out/file-source.port'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'

const GOOGLE_WORKSPACE_EXPORTS: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
}

const SUPPORTED_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/csv',
]

function isSupportedMimeType(mimeType: string): boolean {
  if (mimeType in GOOGLE_WORKSPACE_EXPORTS) return true
  return SUPPORTED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))
}

export class GoogleDriveAdapter implements FileSourcePort {
  async fetchFileContent(
    fileId: string,
    accessToken: string,
  ): Promise<FileSourceContent> {
    const headers = { Authorization: `Bearer ${accessToken}` }

    // 1. Get file metadata
    const metaRes = await fetch(
      `${DRIVE_API}/files/${fileId}?fields=name,mimeType,size`,
      { headers },
    )

    if (!metaRes.ok) {
      const err = await metaRes.text()
      throw new Error(`Failed to get file metadata: ${err}`)
    }

    const meta = (await metaRes.json()) as {
      name: string
      mimeType: string
      size?: string
    }

    if (!isSupportedMimeType(meta.mimeType)) {
      throw new Error(
        `Unsupported file type: ${meta.mimeType}. Only text-based files and Google Docs/Sheets/Slides are supported.`,
      )
    }

    // 2. Download or export content
    let content: string
    const exportMimeType = GOOGLE_WORKSPACE_EXPORTS[meta.mimeType]

    if (exportMimeType) {
      // Google Workspace file — export (fallback to download if export is denied)
      const exportRes = await fetch(
        `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
        { headers },
      )

      if (exportRes.ok) {
        content = await exportRes.text()
      } else {
        throw new Error(
          `Cannot export "${meta.name}": the file owner has disabled downloading for viewers. Ask the owner to enable "Viewers can download" in sharing settings.`,
        )
      }
    } else {
      // Regular file — download
      const downloadRes = await fetch(
        `${DRIVE_API}/files/${fileId}?alt=media`,
        { headers },
      )

      if (!downloadRes.ok) {
        const err = await downloadRes.text()
        throw new Error(`Failed to download file: ${err}`)
      }

      content = await downloadRes.text()
    }

    return {
      content,
      mimeType: exportMimeType ?? meta.mimeType,
      fileName: meta.name,
      externalId: fileId,
    }
  }

  async fetchFilesContent(
    fileIds: string[],
    accessToken: string,
  ): Promise<FileSourceContent[]> {
    return Promise.all(
      fileIds.map((id) => this.fetchFileContent(id, accessToken)),
    )
  }
}
