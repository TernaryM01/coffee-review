'use client'

import type { Preloaded } from 'convex/react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { ListCard } from '~/components/ListCard'
import { EmptyState } from '~/components/States'
import { useMe, usePreloaded } from '~/lib/hooks'

export function UserListsView({
  username,
  preloaded,
}: {
  username: string
  preloaded: Preloaded<typeof api.lists.forUser>
}) {
  const lists = usePreloaded(preloaded)
  const me = useMe()
  const isMe = me?.username.toLowerCase() === username.toLowerCase()

  return (
    <div>
      {isMe && (
        <div className="mb-6">
          <Link href="/lists/new" className="btn-primary">
            <Plus className="size-4" /> New list
          </Link>
        </div>
      )}
      {lists.length === 0 ? (
        <EmptyState title="No lists yet">
          {isMe && 'Group beans however you like: best naturals, holiday gifts, roasters to try…'}
        </EmptyState>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {lists.map((l) => (
            <ListCard key={l._id} list={l} />
          ))}
        </div>
      )}
    </div>
  )
}
