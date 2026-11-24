import { preloadedQueryResult } from 'convex/nextjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { preloadList } from '~/lib/server'
import { ListView } from './ListView'

type Props = { params: Promise<{ listId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = preloadedQueryResult(await preloadList((await params).listId))
  return { title: list?.title ?? 'List not found', description: list?.description }
}

export default async function ListPage({ params }: Props) {
  const preloaded = await preloadList((await params).listId)
  if (!preloadedQueryResult(preloaded)) notFound()
  return <ListView preloaded={preloaded} />
}
