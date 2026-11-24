import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { PAGE } from '~/lib/pageSizes'
import { firstPage } from '~/lib/server'
import { DiaryView } from './DiaryView'

export const metadata: Metadata = { title: 'Diary' }

export default async function DiaryPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const initial = await firstPage(api.logs.diary, { username }, PAGE.diary)
  return <DiaryView username={username} initial={initial} />
}
