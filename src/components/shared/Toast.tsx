'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="system"
      toastOptions={{
        classNames: {
          toast:
            'bg-card border border-border text-foreground text-sm rounded-xl shadow-lg',
          title: 'font-medium text-sm',
          description: 'text-xs text-muted-foreground',
          success:
            'bg-card border border-green-200 dark:border-green-900/50',
          error: 'bg-card border border-red-200 dark:border-red-900/50',
          info: 'bg-card border border-blue-200 dark:border-blue-900/50',
          warning: 'bg-card border border-amber-200 dark:border-amber-900/50',
          actionButton: 'bg-primary text-primary-foreground text-xs rounded-md px-2 py-1',
          cancelButton: 'bg-muted text-muted-foreground text-xs rounded-md px-2 py-1',
        },
      }}
    />
  )
}

export const toast = {
  success: (title: string, description?: string) =>
    sonnerToast.success(title, { description }),
  error: (title: string, description?: string) =>
    sonnerToast.error(title, { description }),
  info: (title: string, description?: string) =>
    sonnerToast.info(title, { description }),
  loading: (title: string, description?: string) =>
    sonnerToast.loading(title, { description }),
}
