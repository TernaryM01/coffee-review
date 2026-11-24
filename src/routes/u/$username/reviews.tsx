import { createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState, LineSkeletons } from '~/components/States'

export const Route = createFileRoute('/u/$username/reviews')({
  component: Reviews,
})

function Reviews() {
  const { username } = Route.useParams()
  const { results, status, loadMore } = usePaginatedQuery(
    api.logs.reviewsForUser,
    { username },
    { initialNumItems: 15 },
  )
  if (status === 'LoadingFirstPage') return <LineSkeletons />
  if (results.length === 0) return <EmptyState title="No reviews yet" />
  return (
    <div className="max-w-3xl">
      {results.map((log) => (
        <ReviewCard key={log._id} log={log} />
      ))}
      {status !== 'Exhausted' && (
        <button className="btn-ghost mt-4" disabled={status === 'LoadingMore'} onClick={() => loadMore(15)}>
          More reviews
        </button>
      )}
    </div>
  )
}
