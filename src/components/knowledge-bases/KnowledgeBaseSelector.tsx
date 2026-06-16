'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/shared/Toast'

interface KnowledgeBase {
  id: string
  name: string
  description: string
  documentCount?: number
}

interface KnowledgeBaseSelectorProps {
  value: string | null
  onChange: (id: string | null) => void
  includeAll?: boolean
  placeholder?: string
}

const ALL_VALUE = '__all__'

export function KnowledgeBaseSelector({
  value,
  onChange,
  includeAll = false,
  placeholder = 'Select knowledge base',
}: KnowledgeBaseSelectorProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])

  useEffect(() => {
    fetch('/api/knowledge-bases')
      .then((r) => r.json())
      .then((d) => setKnowledgeBases(d.knowledgeBases ?? []))
      .catch(() => {
        toast.error('Failed to load knowledge bases')
      })
  }, [])

  const selectValue = value === null && includeAll ? ALL_VALUE : (value ?? '')

  function handleChange(val: string | null) {
    if (val === null || val === ALL_VALUE) {
      onChange(null)
    } else {
      onChange(val)
    }
  }

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={includeAll ? 'All knowledge bases' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value={ALL_VALUE}>All knowledge bases</SelectItem>
        )}
        {knowledgeBases.map((kb) => (
          <SelectItem key={kb.id} value={kb.id}>
            {kb.name}
            {kb.documentCount !== undefined && (
              <span className="ml-1.5 text-muted-foreground text-xs">({kb.documentCount})</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
