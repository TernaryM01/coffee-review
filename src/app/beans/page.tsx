import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer, firstPage } from '~/lib/server'
import { PAGE } from '~/lib/pageSizes'
import { BeansView, type Filters, type Sort } from './BeansView'

export const metadata: Metadata = { title: 'Beans' }

type Search = { q?: string; sort?: string; origin?: string; process?: string; roast?: string; focus?: string }

export default async function BeansPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const sort: Sort = sp.sort === 'rating' || sp.sort === 'newest' ? sp.sort : 'popular'
  const filters: Filters = {
    origin: sp.origin || undefined,
    process: sp.process || undefined,
    roastLevel: sp.roast || undefined,
  }
  const [search, browse] = await Promise.all([
    q ? preloadQuery(api.beans.search, { q, ...filters }, await asViewer()) : null,
    q ? null : firstPage(api.beans.browse, { sort, ...filters }, PAGE.beans),
  ])
  return (
    <BeansView
      q={q}
      sort={sort}
      filters={filters}
      focus={sp.focus === '1'}
      search={search}
      browse={browse}
    />
  )
}
