import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { PAGE } from '~/lib/pageSizes'
import { firstPage } from '~/lib/server'
import { RoastersView } from './RoastersView'

export const metadata: Metadata = { title: 'Roasters' }

export default async function RoastersPage() {
  const initial = await firstPage(api.roasters.list, {}, PAGE.roasters)
  return <RoastersView initial={initial} />
}
