'use client'

import { useMutation, useQuery } from 'convex/react'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { errorMessage, plural } from '~/lib/format'
import { Dialog, ErrorText } from './ui'

export function AddToListDialog({
  beanId,
  open,
  onClose,
}: {
  beanId: Id<'beans'>
  open: boolean
  onClose: () => void
}) {
  const lists = useQuery(api.lists.mineWithBean, open ? { beanId } : 'skip')
  const addBean = useMutation(api.lists.addBean)
  const removeBean = useMutation(api.lists.removeBean)
  const createList = useMutation(api.lists.create)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add to lists">
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          void run(async () => {
            const listId = await createList({ title, ranked: false })
            await addBean({ listId, beanId })
            setTitle('')
          })
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New list name"
          className="field"
          aria-label="New list name"
        />
        <button className="btn-primary shrink-0" type="submit" disabled={!title.trim()}>
          <Plus className="size-4" /> New
        </button>
      </form>
      <ErrorText>{error}</ErrorText>
      {lists === undefined ? (
        <p className="text-sm text-dim">Loading your lists…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-muted">You don't have any lists yet. Name one above.</p>
      ) : (
        <ul className="divide-y divide-line">
          {lists.map((l) => (
            <li key={l._id}>
              <button
                className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left hover:bg-raised"
                onClick={() =>
                  void run(() =>
                    l.contains
                      ? removeBean({ listId: l._id, beanId })
                      : addBean({ listId: l._id, beanId }),
                  )
                }
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{l.title}</span>
                  <span className="text-xs text-dim">{plural(l.beanCount, 'bean')}</span>
                </span>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${l.contains ? 'border-leaf bg-leaf text-bg' : 'border-line'}`}
                >
                  {l.contains && <Check className="size-4" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
