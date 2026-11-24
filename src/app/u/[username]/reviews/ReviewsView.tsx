'use client'

import type { PaginatedQueryItem } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState } from '~/components/States'
import { PAGE } from '~/lib/pageSizes'
import { usePaginatedWithInitial, type FirstPage } from '~/lib/paginated'

export function ReviewsView({
  username,
  initial,
}: {
  username: string
  initial: FirstPage<PaginatedQueryItem<typeof api.logs.reviewsForUser>>
}) {
  const { results, status, loadMore } = usePaginatedWithInitial(
    api.logs.reviewsForUser,
    { username },
    initial,
    PAGE.userReviews,
  )
  if (results.length === 0) return <EmptyState title="No reviews yet" />
  return (
    <div className="max-w-3xl">
      {results.map((log) => (
        <ReviewCard key={log._id} log={log} />
      ))}
      {status !== 'Exhausted' && (
        <button className="btn-ghost mt-4" disabled={status === 'LoadingMore'} onClick={() => loadMore(PAGE.userReviews)}>
          More reviews
        </button>
      )}
    </div>
  )
}
