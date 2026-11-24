import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer } from '~/lib/server'
import { NetworkView } from './NetworkView'

export const metadata: Metadata = { title: 'Network' }

export default async function NetworkPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const preloaded = await preloadQuery(api.follows.network, { username }, await asViewer())
  return <NetworkView preloaded={preloaded} />
}
