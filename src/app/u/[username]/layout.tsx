import { preloadQuery, preloadedQueryResult } from 'convex/nextjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@convex/_generated/api'
import { asViewer, preloadProfile } from '~/lib/server'
import { ProfileHeader } from './ProfileHeader'

type Props = { params: Promise<{ username: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const user = preloadedQueryResult(await preloadProfile((await params).username))
  if (!user) return { title: 'Member not found' }
  return {
    title: { default: user.name ?? user.username, template: `%s · ${user.name ?? user.username} · Crema` },
    description: user.bio ?? `${user.name ?? user.username}'s coffee diary on Crema.`,
  }
}

export default async function ProfileLayout({ params, children }: Props) {
  const preloaded = await preloadProfile((await params).username)
  const user = preloadedQueryResult(preloaded)
  if (!user) notFound()
  const followStatus = await preloadQuery(api.follows.status, { userId: user._id }, await asViewer())
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ProfileHeader preloaded={preloaded} followStatus={preloadedQueryResult(followStatus)} />
      <div className="mt-8">{children}</div>
    </div>
  )
}
