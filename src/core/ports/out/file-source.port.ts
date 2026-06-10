export interface FileSourceContent {
  content: string
  mimeType: string
  fileName: string
  externalId: string
}

export interface FileSourcePort {
  fetchFileContent(
    fileId: string,
    accessToken: string,
  ): Promise<FileSourceContent>

  fetchFilesContent(
    fileIds: string[],
    accessToken: string,
  ): Promise<FileSourceContent[]>
}
