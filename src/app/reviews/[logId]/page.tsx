import { preloadedQueryResult } from 'convex/nextjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { preloadLog } from '~/lib/server'
import { ReviewView } from './ReviewView'

type Props = { params: Promise<{ logId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const log = preloadedQueryResult(await preloadLog((await params).logId))
  if (!log) return { title: 'Not found' }
  const who = log.user.name ?? log.user.username
  return {
    title: `${who}'s ${log.hasReview ? 'review' : 'brew'} of ${log.bean.name}`,
    description: log.review?.slice(0, 200),
  }
}

export default async function ReviewPage({ params }: Props) {
  const preloaded = await preloadLog((await params).logId)
  if (!preloadedQueryResult(preloaded)) notFound()
  return <ReviewView preloaded={preloaded} />
}
