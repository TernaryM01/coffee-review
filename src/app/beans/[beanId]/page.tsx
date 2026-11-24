import { preloadQuery, preloadedQueryResult } from 'convex/nextjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@convex/_generated/api'
import { PAGE } from '~/lib/pageSizes'
import { asViewer, firstPage, preloadBean } from '~/lib/server'
import { BeanView } from './BeanView'

type Props = { params: Promise<{ beanId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bean = preloadedQueryResult(await preloadBean((await params).beanId))
  if (!bean) return { title: 'Bean not found' }
  return {
    title: `${bean.name} — ${bean.roasterName}`,
    description:
      bean.description ??
      `${bean.name} from ${bean.roasterName}: ${bean.origin}, ${bean.process.toLowerCase()} process, ${bean.roastLevel.toLowerCase()} roast.`,
  }
}

export default async function BeanPage({ params }: Props) {
  const preloadedBean = await preloadBean((await params).beanId)
  const bean = preloadedQueryResult(preloadedBean)
  if (!bean) notFound()

  const beanId = bean._id
  const opts = await asViewer()
  const [mine, myBrews, friends, lists, reviews] = await Promise.all([
    preloadQuery(api.userBeans.mine, { beanId }, opts),
    preloadQuery(api.logs.mineForBean, { beanId }, opts),
    preloadQuery(api.userBeans.friendsForBean, { beanId }, opts),
    preloadQuery(api.lists.containingBean, { beanId }, opts),
    firstPage(api.logs.reviewsForBean, { beanId }, PAGE.beanReviews),
  ])
  return (
    <BeanView
      bean={preloadedBean}
      mine={mine}
      myBrews={myBrews}
      friends={friends}
      lists={lists}
      reviews={reviews}
    />
  )
}
