import { preloadQuery, preloadedQueryResult } from 'convex/nextjs'
import { api } from '@convex/_generated/api'
import { asViewer, preloadMe } from '~/lib/server'
import { HomeView } from './HomeView'

export default async function Home() {
  const opts = await asViewer()
  const signedIn = preloadedQueryResult(await preloadMe()) !== null
  const [popular, recent, reviews, lists, activity] = await Promise.all([
    preloadQuery(api.beans.popular, { limit: 12 }, opts),
    preloadQuery(api.beans.recent, { limit: 6 }, opts),
    preloadQuery(api.logs.recentReviews, { limit: 6 }, opts),
    preloadQuery(api.lists.recent, { limit: 3 }, opts),
    signedIn ? preloadQuery(api.logs.friendsActivity, { limit: 6 }, opts) : null,
  ])
  return <HomeView popular={popular} recent={recent} reviews={reviews} lists={lists} activity={activity} />
}
