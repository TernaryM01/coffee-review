'use client'

import type { Preloaded } from 'convex/react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { ListCard } from '~/components/ListCard'
import { EmptyState } from '~/components/States'
import { usePreloaded } from '~/lib/hooks'

export function ListsView({ preloaded }: { preloaded: Preloaded<typeof api.lists.recent> }) {
  const lists = usePreloaded(preloaded)
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Lists</h1>
          <p className="text-sm text-muted">Collections of beans, curated by the community.</p>
        </div>
        {/* /lists/new sends signed-out visitors to sign in (src/proxy.ts). */}
        <Link href="/lists/new" className="btn-primary">
          <Plus className="size-4" /> Start a list
        </Link>
      </div>
      {lists.length === 0 ? (
        <EmptyState title="No lists yet">
          <Link href="/lists/new" className="text-crema hover:underline">
            Make the first one
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <ListCard key={l._id} list={l} />
          ))}
        </div>
      )}
    </div>
  )
}
