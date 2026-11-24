import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState, LineSkeletons } from '~/components/States'
import { useMe } from '~/lib/hooks'

export const Route = createFileRoute('/activity')({
  head: () => ({ meta: [{ title: 'Activity · Crema' }] }),
  component: Activity,
})

function Activity() {
  const me = useMe()
  const feed = useQuery(api.logs.friendsActivity, me ? { limit: 60 } : 'skip')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl">Friends' activity</h1>
      <p className="mb-6 text-sm text-muted">The latest brews from people you follow.</p>
      {me === null ? (
        <EmptyState title="Sign in to see your feed">
          <Link to="/signin" search={{ redirect: '/activity' }} className="text-crema hover:underline">
            Sign in
          </Link>{' '}
          and follow a few people.
        </EmptyState>
      ) : feed === undefined ? (
        <LineSkeletons count={4} />
      ) : feed.length === 0 ? (
        <EmptyState title="Nothing here yet">
          Find people to follow on the{' '}
          <Link to="/members" className="text-crema hover:underline">
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
