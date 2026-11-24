import { preloadedQueryResult } from 'convex/nextjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { preloadBean, preloadMe } from '~/lib/server'
import { EditBeanForm } from './EditBeanForm'

export const metadata: Metadata = { title: 'Edit bean' }

// Signed-in only (see src/proxy.ts). Only the bean's creator may edit it;
// convex/beans.ts enforces that too.
export default async function EditBeanPage({ params }: { params: Promise<{ beanId: string }> }) {
  const [bean, me] = await Promise.all([
    preloadBean((await params).beanId).then(preloadedQueryResult),
    preloadMe().then(preloadedQueryResult),
  ])
  if (!bean) notFound()
  if (!me || bean.createdBy !== me._id) {
    return (
      <p className="mx-auto max-w-4xl px-4 py-16 text-muted">Only the person who added this bean can edit it.</p>
    )
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl">Edit {bean.name}</h1>
      <EditBeanForm
        beanId={bean._id}
        initial={{
          roaster: { kind: 'existing', roasterId: bean.roasterId, name: bean.roasterName },
          name: bean.name,
          origin: bean.origin,
          region: bean.region ?? '',
          producer: bean.producer ?? '',
          varieties: bean.varieties,
          process: bean.process,
          roastLevel: bean.roastLevel,
          altitudeMin: bean.altitudeMin?.toString() ?? '',
          altitudeMax: bean.altitudeMax?.toString() ?? '',
          harvest: bean.harvest ?? '',
          roasterNotes: bean.roasterNotes,
          description: bean.description ?? '',
          imageUrl: bean.imageUrl,
        }}
      />
    </div>
  )
}
