'use client'

import { useState, useRef, useEffect } from 'react'
import { XIcon, ChevronDownIcon, CheckIcon } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
}

export function MultiSelect({
  values,
  onChange,
  options,
  placeholder = 'Select...',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(val: string) {
    const next = values.includes(val) ? values.filter((v) => v !== val) : [...values, val]
    onChange(next)
  }

  function remove(val: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(values.filter((v) => v !== val))
  }

  const selectedOptions = options.filter((o) => values.includes(o.value))

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setOpen((v) => !v)}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex flex-wrap items-center gap-1.5 min-h-[36px] w-full rounded-md border border-input bg-background px-2 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors"
      >
        {selectedOptions.length === 0 ? (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-md bg-muted border border-border px-1.5 py-0.5 text-xs font-medium"
            >
              {opt.label}
              <button
                onClick={(e) => remove(opt.value, e)}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${opt.label}`}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDownIcon
          className={`size-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-56 overflow-y-auto p-1"
        >
          {options.map((opt) => {
            const isSelected = values.includes(opt.value)
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-muted transition-colors text-sm"
              >
                <CheckIcon
                  className={`size-3.5 shrink-0 ${isSelected ? 'opacity-100 text-primary' : 'opacity-0'}`}
                />
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
