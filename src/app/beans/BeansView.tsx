'use client'

import type { PaginatedQueryItem, Preloaded } from 'convex/react'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@convex/_generated/api'
import { ORIGINS, PROCESSES, ROAST_LEVELS } from '@convex/lib/constants'
import { BeanGrid, BeanTile } from '~/components/BeanPoster'
import { EmptyState } from '~/components/States'
import { useDebounced, usePreloaded } from '~/lib/hooks'
import { PAGE } from '~/lib/pageSizes'
import { usePaginatedWithInitial, type FirstPage } from '~/lib/paginated'

const BEANS_PAGE = PAGE.beans
export type Sort = 'popular' | 'rating' | 'newest'
export type Filters = { origin?: string; process?: string; roastLevel?: string }

export function BeansView({
  q,
  sort,
  filters,
  focus,
  search,
  browse,
}: {
  q?: string
  sort: Sort
  filters: Filters
  focus: boolean
  search: Preloaded<typeof api.beans.search> | null
  browse: FirstPage<PaginatedQueryItem<typeof api.beans.browse>> | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(q ?? '')
  const term = useDebounced(draft.trim(), 300)

  // The URL is the state: changing it re-renders the server page with results.
  const navigate = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const next = {
      q,
      sort: sort === 'popular' ? undefined : sort,
      origin: filters.origin,
      process: filters.process,
      roast: filters.roastLevel,
      ...patch,
    }
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v)
    const qs = params.toString()
    router.replace(qs ? `/beans?${qs}` : '/beans', { scroll: false })
  }

  useEffect(() => {
    if (term !== (q ?? '')) navigate({ q: term || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [term])

  const filtered = Boolean(filters.origin || filters.process || filters.roastLevel)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Beans</h1>
          <p className="text-sm text-muted">Every bag the community has logged, rated, and reviewed.</p>
        </div>
        <Link href="/beans/new" className="btn-ghost">
          <Plus className="size-4" /> Add a bean
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            value={draft}
            autoFocus={focus}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by name, roaster, origin, producer, variety…"
            className="field pl-9"
            aria-label="Search beans"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => navigate({ sort: v === 'popular' ? undefined : v })}
            options={[
              ['popular', 'Most brewed'],
              ['rating', 'Highest rated'],
              ['newest', 'Newest'],
            ]}
            disabled={Boolean(q)}
          />
          <Select label="Origin" value={filters.origin ?? ''} onChange={(v) => navigate({ origin: v || undefined })} options={[['', 'Any origin'], ...ORIGINS.map((o) => [o, o] as [string, string])]} />
          <Select label="Process" value={filters.process ?? ''} onChange={(v) => navigate({ process: v || undefined })} options={[['', 'Any process'], ...PROCESSES.map((o) => [o, o] as [string, string])]} />
          <Select label="Roast" value={filters.roastLevel ?? ''} onChange={(v) => navigate({ roast: v || undefined })} options={[['', 'Any roast'], ...ROAST_LEVELS.map((o) => [o, o] as [string, string])]} />
        </div>
      </div>

      {q && search ? (
        <SearchResults q={q} preloaded={search} />
      ) : browse ? (
        <Browse sort={sort} filters={filters} filtered={filtered} initial={browse} />
      ) : null}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
  disabled?: boolean
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="field py-1.5 disabled:opacity-50 lg:w-40"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}

function SearchResults({ q, preloaded }: { q: string; preloaded: Preloaded<typeof api.beans.search> }) {
  const results = usePreloaded(preloaded)
  if (results.length === 0) {
    return (
      <EmptyState title={`Nothing matches “${q}”`}>
        Is it missing?{' '}
        <Link href="/beans/new" className="text-crema hover:underline">
          Add it to Crema
        </Link>
        .
      </EmptyState>
    )
  }
  return (
    <BeanGrid>
      {results.map((b) => (
        <BeanTile key={b._id} bean={b} showMeta />
      ))}
    </BeanGrid>
  )
}

function Browse({
  sort,
  filters,
  filtered,
  initial,
}: {
  sort: Sort
  filters: Filters
  filtered: boolean
  initial: FirstPage<PaginatedQueryItem<typeof api.beans.browse>>
}) {
  const { results, status, loadMore } = usePaginatedWithInitial(
    api.beans.browse,
    { sort, ...filters },
    initial,
    BEANS_PAGE,
  )
  if (results.length === 0) {
    return (
      <EmptyState title={filtered ? 'No beans match those filters' : 'No beans yet'}>
        <Link href="/beans/new" className="text-crema hover:underline">
          Add a bean
        </Link>{' '}
        to get things started.
      </EmptyState>
    )
  }
  return (
    <>
      <BeanGrid>
        {results.map((b) => (
          <BeanTile key={b._id} bean={b} showMeta />
        ))}
      </BeanGrid>
      {status !== 'Exhausted' && (
        <div className="mt-8 text-center">
          <button className="btn-ghost" disabled={status === 'LoadingMore'} onClick={() => loadMore(BEANS_PAGE)}>
            {status === 'LoadingMore' ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
