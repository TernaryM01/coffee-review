'use client'

import type { PaginatedQueryItem } from 'convex/react'
import { api } from '@convex/_generated/api'
import { PAGE } from '~/lib/pageSizes'
import { usePaginatedWithInitial, type FirstPage } from '~/lib/paginated'
import { BeanGrid, BeanTile } from './BeanPoster'
import { EmptyState } from './States'

const USER_BEANS_PAGE = PAGE.userBeans

const EMPTY = {
  brewed: 'No beans brewed yet.',
  liked: 'No liked beans yet.',
  wishlist: 'The wishlist is empty.',
}

/** Brewed / liked / wishlisted beans of a user, as a poster grid. */
export function UserBeans({
  username,
  kind,
  initial,
}: {
  username: string
  kind: 'brewed' | 'liked' | 'wishlist'
  initial: FirstPage<PaginatedQueryItem<typeof api.userBeans.forUser>>
}) {
  const { results, status, loadMore } = usePaginatedWithInitial(
    api.userBeans.forUser,
    { username, kind },
    initial,
    USER_BEANS_PAGE,
  )
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
          <button className="btn-ghost" disabled={status === 'LoadingMore'} onClick={() => loadMore(USER_BEANS_PAGE)}>
            Load more
          </button>
        </div>
      )}
    </>
  )
}
