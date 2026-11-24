import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer } from '~/lib/server'
import { MembersView } from './MembersView'

export const metadata: Metadata = { title: 'Members' }

export default async function MembersPage() {
  const preloaded = await preloadQuery(api.users.popular, {}, await asViewer())
  return <MembersView preloaded={preloaded} />
}
