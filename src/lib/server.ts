// Server-only data helpers for Server Components and generateMetadata.
import { fetchQuery, preloadQuery } from 'convex/nextjs'
import type { PaginatedQueryArgs, PaginatedQueryItem, PaginatedQueryReference } from 'convex/react'
import { cache } from 'react'
import { api } from '@convex/_generated/api'
import { convexAuthNextjsAccessToken } from './convexAuth'
import type { FirstPage } from './paginated'

/** The signed-in user's access token (from the auth cookie), once per request. */
const getToken = cache(async () => (await convexAuthNextjsAccessToken()) ?? undefined)

/** Options for convex/nextjs calls: run queries as the signed-in user. */
export async function asViewer() {
  return { token: await getToken() }
}

/**
 * The first page of a paginated query, rendered on the server. Client
 * components hand it to `usePaginatedWithInitial`, which switches to the live
 * paginated query once it loads.
 */
export async function firstPage<Q extends PaginatedQueryReference>(
  query: Q,
  args: PaginatedQueryArgs<Q>,
  numItems: number,
): Promise<FirstPage<PaginatedQueryItem<Q>>> {
  // convex/nextjs can't infer args through the generic Q; the shape is right
  // by construction (PaginatedQueryArgs<Q> + paginationOpts).
  const result = await fetchQuery(
    query as PaginatedQueryReference,
    { ...args, paginationOpts: { numItems, cursor: null } } as never,
    await asViewer(),
  )
  return { page: result.page as PaginatedQueryItem<Q>[], isDone: result.isDone }
}

// Loaders shared by a page and its generateMetadata (or a layout and its
// pages). React's cache() dedupes them within one request.

export const preloadMe = cache(async () => preloadQuery(api.users.me, {}, await asViewer()))

export const preloadBean = cache(async (beanId: string) =>
  preloadQuery(api.beans.get, { beanId }, await asViewer()),
)

export const preloadProfile = cache(async (username: string) =>
  preloadQuery(api.users.byUsername, { username }, await asViewer()),
)

export const preloadLog = cache(async (logId: string) =>
  preloadQuery(api.logs.get, { logId }, await asViewer()),
)

export const preloadList = cache(async (listId: string) =>
  preloadQuery(api.lists.get, { listId }, await asViewer()),
)

export const preloadRoaster = cache(async (slug: string) =>
  preloadQuery(api.roasters.bySlug, { slug }, await asViewer()),
)
