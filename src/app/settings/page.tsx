import { preloadQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { asViewer } from '~/lib/server'
import { SettingsView } from './SettingsView'

export const metadata: Metadata = { title: 'Settings' }

// Signed-in only (see src/proxy.ts).
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [{ welcome }, passkeys] = await Promise.all([
    searchParams,
    preloadQuery(api.auth.listPasskeys, {}, await asViewer()),
  ])
  return <SettingsView welcome={welcome === '1'} passkeys={passkeys} />
}
