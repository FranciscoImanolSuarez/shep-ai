'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
}

export function Combobox({ value, onChange, options, placeholder = 'Select...' }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      o.description?.toLowerCase().includes(query.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon
          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground px-1"
            />
          </div>

          {/* Options */}
          <ul role="listbox" className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="py-4 text-center text-xs text-muted-foreground">No results</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex items-start gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted transition-colors text-sm"
                >
                  <CheckIcon
                    className={`size-3.5 mt-0.5 shrink-0 ${opt.value === value ? 'opacity-100 text-primary' : 'opacity-0'}`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{opt.label}</p>
                    {opt.description && (
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
