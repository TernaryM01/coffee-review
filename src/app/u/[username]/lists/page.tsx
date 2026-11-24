import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer } from '~/lib/server'
import { UserListsView } from './UserListsView'

export const metadata: Metadata = { title: 'Lists' }

export default async function UserListsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const preloaded = await preloadQuery(api.lists.forUser, { username }, await asViewer())
  return <UserListsView username={username} preloaded={preloaded} />
}
