'use client'

import type { PaginatedQueryItem } from 'convex/react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { EmptyState } from '~/components/States'
import { plural } from '~/lib/format'
import { PAGE } from '~/lib/pageSizes'
import { usePaginatedWithInitial, type FirstPage } from '~/lib/paginated'

export function RoastersView({ initial }: { initial: FirstPage<PaginatedQueryItem<typeof api.roasters.list>> }) {
  const { results, status, loadMore } = usePaginatedWithInitial(api.roasters.list, {}, initial, PAGE.roasters)
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl">Roasters</h1>
      <p className="mb-6 text-sm text-muted">The people behind the bags.</p>
      {results.length === 0 ? (
        <EmptyState title="No roasters yet">They're added along with their beans.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <Link
              key={r._id}
              href={`/roasters/${r.slug}`}
              className="card flex items-center justify-between gap-4 p-4 transition hover:border-crema/50"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-lg">{r.name}</p>
                <p className="truncate text-xs text-muted">{r.location ?? '—'}</p>
              </div>
              <span className="shrink-0 text-xs text-dim">{plural(r.beanCount, 'bean')}</span>
            </Link>
          ))}
        </div>
      )}
      {status === 'CanLoadMore' && (
        <div className="mt-8 text-center">
          <button className="btn-ghost" onClick={() => loadMore(PAGE.roasters)}>
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
