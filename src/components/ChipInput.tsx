'use client'

import { X } from 'lucide-react'
import { useId, useState } from 'react'

export function ChipInput({
  label,
  value,
  onChange,
  suggestions = [],
  max = 12,
  placeholder = 'Type and press Enter',
}: {
  label: string
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: readonly string[]
  max?: number
  placeholder?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const has = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase())

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (!tag || has(tag) || value.length >= max) return
    onChange([...value, tag.slice(0, 32)])
    setDraft('')
  }

  const q = draft.trim().toLowerCase()
  const shown = suggestions
    .filter((s) => !has(s) && (q === '' || s.toLowerCase().includes(q)))
    .slice(0, q ? 8 : 14)

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="field flex flex-wrap items-center gap-1.5 py-1.5 focus-within:border-crema">
        {value.map((tag) => (
          <span key={tag} className="chip border-crema/40 bg-crema/10 text-crema">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              aria-label={`Remove ${tag}`}
              className="hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length >= max ? `Up to ${max}` : placeholder}
          disabled={value.length >= max}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-dim"
        />
      </div>
      {shown.length > 0 && value.length < max && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="chip hover:border-crema/50 hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
