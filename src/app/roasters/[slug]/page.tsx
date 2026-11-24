import { preloadedQueryResult } from 'convex/nextjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { preloadRoaster } from '~/lib/server'
import { RoasterView } from './RoasterView'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = preloadedQueryResult(await preloadRoaster((await params).slug))
  return { title: data?.roaster.name ?? 'Roaster not found' }
}

export default async function RoasterPage({ params }: Props) {
  const preloaded = await preloadRoaster((await params).slug)
  if (!preloadedQueryResult(preloaded)) notFound()
  return <RoasterView preloaded={preloaded} />
}
