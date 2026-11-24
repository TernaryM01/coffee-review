import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer } from '~/lib/server'
import { ListsView } from './ListsView'

export const metadata: Metadata = { title: 'Lists' }

export default async function ListsPage() {
  const preloaded = await preloadQuery(api.lists.recent, { limit: 30 }, await asViewer())
  return <ListsView preloaded={preloaded} />
}
