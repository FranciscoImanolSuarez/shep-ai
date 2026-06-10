'use client'

import { useState, useRef, useCallback } from 'react'
import { UploadCloudIcon, FileIcon, XIcon } from 'lucide-react'

interface FileUploadProps {
  onFiles: (files: File[]) => void
  accept?: string
  maxSize?: number
  multiple?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  onFiles,
  accept,
  maxSize,
  multiple = false,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).filter((f) => {
      if (maxSize && f.size > maxSize) return false
      return true
    })
    const next = multiple ? [...selected, ...arr] : arr
    setSelected(next)
    onFiles(next)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, multiple, maxSize]
  )

  function removeFile(index: number) {
    const next = selected.filter((_, i) => i !== index)
    setSelected(next)
    onFiles(next)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload files"
        className={`
          flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          p-8 cursor-pointer transition-all
          ${dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/60'
          }
        `}
      >
        <UploadCloudIcon
          className={`size-8 transition-colors ${dragging ? 'text-primary' : 'text-muted-foreground'}`}
        />
        <div className="text-center">
          <p className="text-sm font-medium">
            {dragging ? 'Drop files here' : 'Drag & drop or click to browse'}
          </p>
          {maxSize && (
            <p className="text-xs text-muted-foreground mt-1">Max {formatBytes(maxSize)} per file</p>
          )}
          {accept && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{accept}</p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
          aria-hidden="true"
        />
      </div>

      {/* File list */}
      {selected.length > 0 && (
        <ul className="space-y-2">
          {selected.map((file, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <FileIcon className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
