import { usePaginatedQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { BeanGrid, BeanTile } from './BeanPoster'
import { EmptyState, PosterSkeletons } from './States'

const EMPTY = {
  brewed: 'No beans brewed yet.',
  liked: 'No liked beans yet.',
  wishlist: 'The wishlist is empty.',
}

/** Brewed / liked / wishlisted beans of a user, as a poster grid. */
export function UserBeans({
  username,
  kind,
}: {
  username: string
  kind: 'brewed' | 'liked' | 'wishlist'
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.userBeans.forUser,
    { username, kind },
    { initialNumItems: 36 },
  )
  if (status === 'LoadingFirstPage') return <PosterSkeletons count={12} />
  if (results.length === 0) return <EmptyState title={EMPTY[kind]} />
  return (
    <>
      <BeanGrid>
        {results.map(({ bean, rating, liked }) => (
          <BeanTile
            key={bean._id}
            bean={bean}
            rating={kind === 'wishlist' ? undefined : rating}
            liked={kind === 'brewed' && liked}
          />
        ))}
      </BeanGrid>
      {status !== 'Exhausted' && (
        <div className="mt-8 text-center">
          <button className="btn-ghost" disabled={status === 'LoadingMore'} onClick={() => loadMore(36)}>
            Load more
          </button>
        </div>
      )}
    </>
  )
}
