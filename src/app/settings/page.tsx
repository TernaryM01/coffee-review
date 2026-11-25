import type { Metadata } from 'next'
import { SettingsView } from './SettingsView'

export const metadata: Metadata = { title: 'Settings' }

// Signed-in only (see src/proxy.ts).
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams
  return <SettingsView welcome={welcome === '1'} />
}
