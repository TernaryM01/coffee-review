'use client'

import { useMutation, type Preloaded } from 'convex/react'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { BeanPicker } from '~/components/BeanPicker'
import { BeanGrid, BeanTile } from '~/components/BeanPoster'
import { ListForm } from '~/components/ListForm'
import { EmptyState, NotFound } from '~/components/States'
import { Avatar, Dialog, ErrorText, UserLink } from '~/components/ui'
import { errorMessage, plural, timeAgo } from '~/lib/format'
import { useMe, usePreloaded } from '~/lib/hooks'

export function ListView({ preloaded }: { preloaded: Preloaded<typeof api.lists.get> }) {
  const list = usePreloaded(preloaded)
  const me = useMe()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = useMutation(api.lists.update)
  const removeList = useMutation(api.lists.remove)
  const addBean = useMutation(api.lists.addBean)
  const removeBean = useMutation(api.lists.removeBean)
  const move = useMutation(api.lists.move)
  const router = useRouter()

  if (!list) return <NotFound what="list" />
  const isOwner = me?._id === list.userId
  const run = (fn: () => Promise<unknown>) => {
    setError(null)
    fn().catch((e) => setError(errorMessage(e)))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {editing ? (
        <div className="card mb-8 p-5">
          <ListForm
            initial={{ title: list.title, description: list.description ?? '', ranked: list.ranked }}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              await update({ listId: list._id, ...values })
              setEditing(false)
            }}
          />
        </div>
      ) : (
        <header className="mb-8">
          {list.owner && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted">
              <Avatar user={list.owner} size={24} />
              List by <UserLink user={list.owner} />
              <span className="text-dim">· updated {timeAgo(list.updatedAt)}</span>
            </div>
          )}
          <h1 className="font-display text-4xl font-semibold leading-tight">{list.title}</h1>
          {list.description && <p className="prose-review mt-3 max-w-2xl text-muted">{list.description}</p>}
          <p className="mt-2 text-xs uppercase tracking-wider text-dim">{plural(list.beanCount, 'bean')}</p>
          {isOwner && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => setAdding(true)}>
                <Plus className="size-4" /> Add beans
              </button>
              <button className="btn-ghost" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit
              </button>
              {confirmDelete ? (
                <span className="flex items-center gap-2 text-sm">
                  Delete this list?
                  <button
                    className="btn-danger px-3 py-1.5"
                    onClick={() =>
                      run(async () => {
                        await removeList({ listId: list._id })
                        router.push(`/u/${me!.username}/lists`)
                      })
                    }
                  >
                    Delete
                  </button>
                  <button className="text-muted" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button className="btn-ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" /> Delete
                </button>
              )}
            </div>
          )}
        </header>
      )}

      <ErrorText>{error}</ErrorText>

      {list.items.length === 0 ? (
        <EmptyState title="This list is empty">{isOwner && 'Use “Add beans” to fill it up.'}</EmptyState>
      ) : isOwner ? (
        <ol className="divide-y divide-line rounded-lg border border-line">
          {list.items.map(({ bean }, i) => (
            <li key={bean._id} className="flex items-center gap-3 p-2">
              {list.ranked && <span className="w-6 text-right font-display text-lg text-dim">{i + 1}</span>}
              <div className="w-10 shrink-0">
                <BeanTile bean={bean} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{bean.name}</p>
                <p className="truncate text-xs text-muted">{bean.roasterName}</p>
              </div>
              <ItemButton label="Move up" disabled={i === 0} onClick={() => run(() => move({ listId: list._id, beanId: bean._id, direction: 'up' }))}>
                <ChevronUp className="size-4" />
              </ItemButton>
              <ItemButton label="Move down" disabled={i === list.items.length - 1} onClick={() => run(() => move({ listId: list._id, beanId: bean._id, direction: 'down' }))}>
                <ChevronDown className="size-4" />
              </ItemButton>
              <ItemButton label="Remove" onClick={() => run(() => removeBean({ listId: list._id, beanId: bean._id }))}>
                <X className="size-4" />
              </ItemButton>
            </li>
          ))}
        </ol>
      ) : (
        <BeanGrid>
          {list.items.map(({ bean }, i) => (
            <div key={bean._id} className="relative">
              {list.ranked && (
                <span className="absolute -left-1 -top-2 z-10 rounded-full bg-bg px-1.5 font-display text-sm text-crema ring-1 ring-line">
                  {i + 1}
                </span>
              )}
              <BeanTile bean={bean} showMeta />
            </div>
          ))}
        </BeanGrid>
      )}

      {isOwner && (
        <Dialog open={adding} onClose={() => setAdding(false)} title="Add beans">
          <BeanPicker
            exclude={list.items.map((it) => it.bean._id)}
            onPick={(bean) => run(() => addBean({ listId: list._id, beanId: bean._id as Id<'beans'> }))}
          />
        </Dialog>
      )}
    </div>
  )
}

function ItemButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1.5 text-dim hover:bg-raised hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}
