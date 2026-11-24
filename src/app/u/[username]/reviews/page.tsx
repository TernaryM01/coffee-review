import type { Metadata } from 'next'
import { api } from '@convex/_generated/api'
import { PAGE } from '~/lib/pageSizes'
import { firstPage } from '~/lib/server'
import { ReviewsView } from './ReviewsView'

export const metadata: Metadata = { title: 'Reviews' }

export default async function ReviewsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const initial = await firstPage(api.logs.reviewsForUser, { username }, PAGE.userReviews)
  return <ReviewsView username={username} initial={initial} />
}
