'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { BeanCard } from '@convex/lib/hydrate'
import { useDebounced } from '~/lib/hooks'
import { BeanPoster } from './BeanPoster'

export function BeanPicker({
  onPick,
  exclude = [],
  autoFocus = true,
}: {
  onPick: (bean: BeanCard) => void
  exclude?: string[]
  autoFocus?: boolean
}) {
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim(), 200)
  const searched = useQuery(api.beans.search, term ? { q: term, limit: 12 } : 'skip')
  const popular = useQuery(api.beans.popular, term ? 'skip' : { limit: 8 })
  const results = (term ? searched : popular)?.filter((b) => !exclude.includes(b._id))

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search beans, roasters, origins…"
          className="field pl-9"
          aria-label="Search beans"
        />
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-dim">
        {term ? 'Results' : 'Popular'}
      </p>
      <ul className="mt-1 divide-y divide-line">
        {results === undefined && <li className="py-3 text-sm text-dim">Searching…</li>}
        {results?.length === 0 && (
          <li className="py-3 text-sm text-muted">No beans match “{term}”.</li>
        )}
        {results?.map((bean) => (
          <li key={bean._id}>
            <button
              type="button"
              onClick={() => onPick(bean)}
              className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left hover:bg-raised"
            >
              <BeanPoster bean={bean} className="w-10 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{bean.name}</span>
                <span className="block truncate text-xs text-muted">
                  {bean.roasterName} · {bean.origin}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
        Can't find it?{' '}
        <Link href="/beans/new" className="font-semibold text-crema hover:underline">
          Add a bean to Crema
        </Link>
      </p>
    </div>
  )
}
