import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { UserBeans } from '~/components/UserBeans'
import { PAGE } from '~/lib/pageSizes'
import { firstPage } from '~/lib/server'

export const metadata: Metadata = { title: 'Wishlist' }

export default async function WishlistPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const initial = await firstPage(api.userBeans.forUser, { username, kind: 'wishlist' }, PAGE.userBeans)
  return <UserBeans username={username} kind="wishlist" initial={initial} />
}
