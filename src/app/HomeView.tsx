'use client'

import type { Preloaded } from 'convex/react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import type { BeanCard } from '@convex/lib/hydrate'
import { BeanGrid, BeanPoster, BeanTile } from '~/components/BeanPoster'
import { ListCard } from '~/components/ListCard'
import { Stars } from '~/components/Rating'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState } from '~/components/States'
import { Avatar, SectionTitle } from '~/components/ui'
import { useMe, usePreloaded } from '~/lib/hooks'

export function HomeView(props: {
  popular: Preloaded<typeof api.beans.popular>
  recent: Preloaded<typeof api.beans.recent>
  reviews: Preloaded<typeof api.logs.recentReviews>
  lists: Preloaded<typeof api.lists.recent>
  activity: Preloaded<typeof api.logs.friendsActivity> | null
}) {
  const me = useMe()
  const popular = usePreloaded(props.popular)
  const recent = usePreloaded(props.recent)
  const reviews = usePreloaded(props.reviews)
  const lists = usePreloaded(props.lists)

  return (
    <div>
      {me ? <Welcome name={me.name ?? me.username} /> : <Hero posters={popular} />}

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {me && props.activity && <FriendsActivity preloaded={props.activity} />}

        <section>
          <SectionTitle more={<Link href="/beans?sort=popular" className="hover:text-ink">More</Link>}>
            Popular beans
          </SectionTitle>
          {popular.length === 0 ? (
            <EmptyState title="No beans yet">
              Be the first to{' '}
              <Link href="/beans/new" className="text-crema hover:underline">
                add one
              </Link>
              .
            </EmptyState>
          ) : (
            <BeanGrid>
              {popular.slice(0, 6).map((b) => (
                <BeanTile key={b._id} bean={b} />
              ))}
            </BeanGrid>
          )}
        </section>

        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          <section>
            <SectionTitle>Recent reviews</SectionTitle>
            {reviews.length === 0 ? (
              <EmptyState title="No reviews yet">Brew something and tell us about it.</EmptyState>
            ) : (
              reviews.map((log) => <ReviewCard key={log._id} log={log} />)
            )}
          </section>
          <aside className="space-y-10">
            <section>
              <SectionTitle more={<Link href="/beans?sort=newest" className="hover:text-ink">More</Link>}>
                Just added
              </SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {recent.map((b) => (
                  <BeanTile key={b._id} bean={b} />
                ))}
              </div>
            </section>
            <section>
              <SectionTitle more={<Link href="/lists" className="hover:text-ink">More</Link>}>Lists</SectionTitle>
              {lists.length === 0 ? (
                <p className="text-sm text-muted">No lists yet.</p>
              ) : (
                <div className="space-y-5">
                  {lists.map((l) => (
                    <ListCard key={l._id} list={l} compact />
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Hero({ posters }: { posters: BeanCard[] }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex -rotate-6 scale-125 flex-wrap content-center justify-center gap-3 opacity-25"
      >
        {[...posters, ...posters, ...posters].slice(0, 24).map((b, i) => (
          <BeanPoster key={`${b._id}-${i}`} bean={b} className="w-24 sm:w-28" />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/85 to-bg" />
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-6xl">
          Remember every bag.
          <br />
          <span className="text-crema">Find the next great one.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Crema is a diary for the coffee you brew. Log what you drink, rate and review beans, keep
          a wishlist, and follow friends with good taste.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signin" className="btn-primary px-6 py-3 text-base">
            Start your diary — it's free
          </Link>
          <Link href="/beans" className="btn-ghost px-6 py-3 text-base">
            Browse beans
          </Link>
        </div>
        <ul className="mx-auto mt-12 grid max-w-2xl gap-4 text-left text-sm text-muted sm:grid-cols-3">
          <li className="card p-4">
            <p className="mb-1 font-semibold text-ink">☕ Log your brews</p>
            Date, method, recipe, and what you tasted.
          </li>
          <li className="card p-4">
            <p className="mb-1 font-semibold text-ink">★ Rate & review</p>
            Half-star ratings and honest notes.
          </li>
          <li className="card p-4">
            <p className="mb-1 font-semibold text-ink">♥ Share your taste</p>
            Favorites, lists, and friends' activity.
          </li>
        </ul>
      </div>
    </section>
  )
}

function Welcome({ name }: { name: string }) {
  return (
    <section className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center">
        <h1 className="font-display text-3xl">
          Welcome back, <span className="text-crema">{name}</span>.
        </h1>
        <p className="mt-2 text-muted">Here's what your friends have been brewing.</p>
      </div>
    </section>
  )
}

function FriendsActivity({ preloaded }: { preloaded: Preloaded<typeof api.logs.friendsActivity> }) {
  const activity = usePreloaded(preloaded)
  return (
    <section>
      <SectionTitle more={<Link href="/activity" className="hover:text-ink">All activity</Link>}>
        New from friends
      </SectionTitle>
      {activity.length === 0 ? (
        <EmptyState title="Your feed is quiet">
          Follow people from{' '}
          <Link href="/members" className="text-crema hover:underline">
            Members
          </Link>{' '}
          or a review you liked, and their brews will show up here.
        </EmptyState>
      ) : (
        <BeanGrid>
          {activity.map((log) => (
            <div key={log._id} className="min-w-0">
              <Link href={`/reviews/${log._id}`} className="block rounded-md hover:ring-2 hover:ring-crema">
                <BeanPoster bean={log.bean} />
              </Link>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <Avatar user={log.user} size={18} />
                {log.rating !== undefined && <Stars rating={log.rating} />}
                {log.liked && <span className="text-cherry">♥</span>}
                {log.hasReview && (
                  <span className="text-dim" title="Has a review">
                    ≡
                  </span>
                )}
              </div>
            </div>
          ))}
        </BeanGrid>
      )}
    </section>
  )
}
