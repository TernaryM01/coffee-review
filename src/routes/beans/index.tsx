import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@convex/_generated/api'
import { ORIGINS, PROCESSES, ROAST_LEVELS } from '@convex/lib/constants'
import { BeanGrid, BeanTile } from '~/components/BeanPoster'
import { EmptyState, PosterSkeletons } from '~/components/States'
import { useDebounced } from '~/lib/hooks'

type Sort = 'popular' | 'rating' | 'newest'
type BeansSearch = {
  q?: string
  sort?: Sort
  origin?: string
  process?: string
  roast?: string
  focus?: boolean
}

const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined)

export const Route = createFileRoute('/beans/')({
  validateSearch: (s: Record<string, unknown>): BeansSearch => ({
    q: str(s.q),
    sort: s.sort === 'rating' || s.sort === 'newest' || s.sort === 'popular' ? s.sort : undefined,
    origin: str(s.origin),
    process: str(s.process),
    roast: str(s.roast),
    focus: s.focus === true || s.focus === 'true' ? true : undefined,
  }),
  head: () => ({ meta: [{ title: 'Beans · Crema' }] }),
  component: Beans,
})

function Beans() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/beans/' })
  const [q, setQ] = useState(search.q ?? '')
  const debounced = useDebounced(q.trim(), 300)

  useEffect(() => {
    if (debounced !== (search.q ?? '')) {
      void navigate({ search: (s) => ({ ...s, q: debounced || undefined, focus: undefined }), replace: true })
    }
  }, [debounced, search.q, navigate])

  const set = (patch: Partial<BeansSearch>) =>
    void navigate({ search: (s) => ({ ...s, ...patch }), replace: true })

  const filters = {
    origin: search.origin,
    process: search.process,
    roastLevel: search.roast,
  }
  const filtered = Boolean(search.origin || search.process || search.roast)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Beans</h1>
          <p className="text-sm text-muted">Every bag the community has logged, rated, and reviewed.</p>
        </div>
        <Link to="/beans/new" className="btn-ghost">
          <Plus className="size-4" /> Add a bean
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            value={q}
            autoFocus={search.focus}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, roaster, origin, producer, variety…"
            className="field pl-9"
            aria-label="Search beans"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <Select
            label="Sort"
            value={search.sort ?? 'popular'}
            onChange={(v) => set({ sort: v as Sort })}
            options={[
              ['popular', 'Most brewed'],
              ['rating', 'Highest rated'],
              ['newest', 'Newest'],
            ]}
            disabled={Boolean(search.q)}
          />
          <Select label="Origin" value={search.origin ?? ''} onChange={(v) => set({ origin: v || undefined })} options={[['', 'Any origin'], ...ORIGINS.map((o) => [o, o] as [string, string])]} />
          <Select label="Process" value={search.process ?? ''} onChange={(v) => set({ process: v || undefined })} options={[['', 'Any process'], ...PROCESSES.map((o) => [o, o] as [string, string])]} />
          <Select label="Roast" value={search.roast ?? ''} onChange={(v) => set({ roast: v || undefined })} options={[['', 'Any roast'], ...ROAST_LEVELS.map((o) => [o, o] as [string, string])]} />
        </div>
      </div>

      {search.q ? (
        <SearchResults q={search.q} filters={filters} />
      ) : (
        <Browse sort={search.sort ?? 'popular'} filters={filters} filtered={filtered} />
      )}
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

type Filters = { origin?: string; process?: string; roastLevel?: string }

function SearchResults({ q, filters }: { q: string; filters: Filters }) {
  const results = useQuery(api.beans.search, { q, ...filters })
  if (results === undefined) return <PosterSkeletons count={12} />
  if (results.length === 0) {
    return (
      <EmptyState title={`Nothing matches “${q}”`}>
        Is it missing?{' '}
        <Link to="/beans/new" className="text-crema hover:underline">
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

function Browse({ sort, filters, filtered }: { sort: Sort; filters: Filters; filtered: boolean }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.beans.browse,
    { sort, ...filters },
    { initialNumItems: 30 },
  )
  if (status === 'LoadingFirstPage') return <PosterSkeletons count={12} />
  if (results.length === 0) {
    return (
      <EmptyState title={filtered ? 'No beans match those filters' : 'No beans yet'}>
        <Link to="/beans/new" className="text-crema hover:underline">
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
          <button className="btn-ghost" disabled={status === 'LoadingMore'} onClick={() => loadMore(30)}>
            {status === 'LoadingMore' ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
