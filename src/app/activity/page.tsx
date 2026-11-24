import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer } from '~/lib/server'
import { ActivityView } from './ActivityView'

export const metadata: Metadata = { title: 'Activity' }

// Signed-in only (see src/proxy.ts).
export default async function ActivityPage() {
  const preloaded = await preloadQuery(api.logs.friendsActivity, { limit: 60 }, await asViewer())
  return <ActivityView preloaded={preloaded} />
}
