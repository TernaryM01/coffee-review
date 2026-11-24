import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { UserBeans } from '~/components/UserBeans'
import { PAGE } from '~/lib/pageSizes'
import { firstPage } from '~/lib/server'

export const metadata: Metadata = { title: 'Likes' }

export default async function LikesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const initial = await firstPage(api.userBeans.forUser, { username, kind: 'liked' }, PAGE.userBeans)
  return <UserBeans username={username} kind="liked" initial={initial} />
}
