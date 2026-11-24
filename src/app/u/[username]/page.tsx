import { preloadQuery } from 'convex/nextjs'
import { api } from '@convex/_generated/api'
import { asViewer, preloadProfile } from '~/lib/server'
import { ProfileHome } from './ProfileHome'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const opts = await asViewer()
  const [profile, recent, reviews] = await Promise.all([
    preloadProfile(username),
    preloadQuery(api.logs.recentForUser, { username, limit: 8 }, opts),
    preloadQuery(api.logs.reviewsForUser, { username, paginationOpts: { numItems: 3, cursor: null } }, opts),
  ])
  return <ProfileHome profile={profile} recent={recent} reviews={reviews} />
}
