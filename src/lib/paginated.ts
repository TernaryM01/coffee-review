'use client'

import {
  usePaginatedQuery,
  type PaginatedQueryArgs,
  type PaginatedQueryItem,
  type PaginatedQueryReference,
  type UsePaginatedQueryReturnType,
} from 'convex/react'

export type FirstPage<Item> = { page: Item[]; isDone: boolean }

/**
 * `usePaginatedQuery`, but showing a server-rendered first page until the live
 * query has loaded its own. `pageSize` must match what the server fetched.
 */
export function usePaginatedWithInitial<Q extends PaginatedQueryReference>(
  query: Q,
  args: PaginatedQueryArgs<Q>,
  initial: FirstPage<PaginatedQueryItem<Q>>,
  pageSize: number,
): UsePaginatedQueryReturnType<Q> {
  const live = usePaginatedQuery(query, args, { initialNumItems: pageSize })
  if (live.status !== 'LoadingFirstPage') return live
  return {
    results: initial.page,
    status: initial.isDone ? 'Exhausted' : 'CanLoadMore',
    isLoading: false,
    // Loading more waits until the live query has taken over.
    loadMore: () => {},
  } as UsePaginatedQueryReturnType<Q>
}
