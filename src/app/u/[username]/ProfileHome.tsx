'use client'

import type { Preloaded } from 'convex/react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { BeanPoster, BeanTile } from '~/components/BeanPoster'
import { Stars } from '~/components/Rating'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState } from '~/components/States'
import { SectionTitle } from '~/components/ui'
import { useMe, usePreloaded } from '~/lib/hooks'

export function ProfileHome(props: {
  profile: Preloaded<typeof api.users.byUsername>
  recent: Preloaded<typeof api.logs.recentForUser>
  reviews: Preloaded<typeof api.logs.reviewsForUser>
}) {
  const user = usePreloaded(props.profile)
  const recent = usePreloaded(props.recent)
  const reviews = usePreloaded(props.reviews)
  const me = useMe()
  if (!user) return null
  const isMe = me?._id === user._id
  const base = `/u/${user.username}`

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
      <div className="space-y-12">
        <section>
          <SectionTitle more={isMe && <Link href="/settings" className="hover:text-ink">Edit</Link>}>
            Favorite beans
          </SectionTitle>
          {user.favorites.length === 0 ? (
            <EmptyState title={isMe ? 'Pick your four favorites' : 'No favorites yet'}>
              {isMe && (
                <Link href="/settings" className="text-crema hover:underline">
                  Choose them in settings
                </Link>
              )}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {user.favorites.map((b) => (
                <BeanTile key={b._id} bean={b} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle more={<Link href={`${base}/reviews`} className="hover:text-ink">More</Link>}>
            Recent reviews
          </SectionTitle>
          {reviews.page.length === 0 ? (
            <p className="text-sm text-muted">No reviews yet.</p>
          ) : (
            reviews.page.map((log) => <ReviewCard key={log._id} log={log} />)
          )}
        </section>
      </div>

      <aside>
        <SectionTitle more={<Link href={`${base}/diary`} className="hover:text-ink">Diary</Link>}>
          Recently brewed
        </SectionTitle>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {recent.map((log) => (
              <Link key={log._id} href={`/reviews/${log._id}`} className="group min-w-0" title={log.bean.name}>
                <BeanPoster bean={log.bean} className="group-hover:ring-2 group-hover:ring-crema" />
                <p className="mt-1 text-[11px]">
                  {log.rating !== undefined && <Stars rating={log.rating} />}
                  {log.liked && <span className="ml-0.5 text-cherry">♥</span>}
                </p>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
