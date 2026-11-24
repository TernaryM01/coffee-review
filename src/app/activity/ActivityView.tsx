'use client'

import type { Preloaded } from 'convex/react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState } from '~/components/States'
import { usePreloaded } from '~/lib/hooks'

export function ActivityView({ preloaded }: { preloaded: Preloaded<typeof api.logs.friendsActivity> }) {
  const feed = usePreloaded(preloaded)
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl">Friends' activity</h1>
      <p className="mb-6 text-sm text-muted">The latest brews from people you follow.</p>
      {feed.length === 0 ? (
        <EmptyState title="Nothing here yet">
          Find people to follow on the{' '}
          <Link href="/members" className="text-crema hover:underline">
            Members
          </Link>{' '}
          page.
        </EmptyState>
      ) : (
        feed.map((log) => <ReviewCard key={log._id} log={log} />)
      )}
    </div>
  )
}
