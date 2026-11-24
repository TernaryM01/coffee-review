import { useState } from 'react'
import { LIMITS } from '@convex/lib/constants'
import { errorMessage } from '~/lib/format'
import { ErrorText } from './ui'

export type ListValues = { title: string; description: string; ranked: boolean }

export function ListForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ListValues
  submitLabel: string
  onSubmit: (values: { title: string; description?: string; ranked: boolean }) => Promise<void>
  onCancel?: () => void
}) {
  const [v, setV] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setSaving(true)
        try {
          await onSubmit({ title: v.title, description: v.description.trim() || undefined, ranked: v.ranked })
        } catch (err) {
          setError(errorMessage(err))
        } finally {
          setSaving(false)
        }
      }}
    >
      <label className="block">
        <span className="label">Name</span>
        <input
          required
          maxLength={LIMITS.listTitleMax}
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          placeholder="e.g. Best naturals of 2026"
          className="field"
        />
      </label>
      <label className="block">
        <span className="label">Description</span>
        <textarea
          rows={3}
          maxLength={LIMITS.descriptionMax}
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          className="field"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={v.ranked} onChange={(e) => setV({ ...v, ranked: e.target.checked })} className="accent-crema" />
        Ranked list (show numbers)
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
