import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { BeanPoster, BeanTile } from '~/components/BeanPoster'
import { ReviewCard } from '~/components/ReviewCard'
import { Stars } from '~/components/Rating'
import { EmptyState, PosterSkeletons } from '~/components/States'
import { SectionTitle } from '~/components/ui'
import { useMe } from '~/lib/hooks'
import { profileQuery } from '~/lib/queries'

export const Route = createFileRoute('/u/$username/')({
  component: ProfileHome,
})

function ProfileHome() {
  const { username } = Route.useParams()
  const { data: user } = useSuspenseQuery(profileQuery(username))
  const me = useMe()
  const recent = useQuery(api.logs.recentForUser, { username, limit: 8 })
  const reviews = useQuery(api.logs.reviewsForUser, {
    username,
    paginationOpts: { numItems: 3, cursor: null },
  })
  if (!user) return null
  const isMe = me?._id === user._id
  const params = { username: user.username }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
      <div className="space-y-12">
        <section>
          <SectionTitle more={isMe && <Link to="/settings" className="hover:text-ink">Edit</Link>}>
            Favorite beans
          </SectionTitle>
          {user.favorites.length === 0 ? (
            <EmptyState title={isMe ? 'Pick your four favorites' : 'No favorites yet'}>
              {isMe && (
                <Link to="/settings" className="text-crema hover:underline">
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
          <SectionTitle more={<Link to="/u/$username/reviews" params={params} className="hover:text-ink">More</Link>}>
            Recent reviews
          </SectionTitle>
          {reviews === undefined ? null : reviews.page.length === 0 ? (
            <p className="text-sm text-muted">No reviews yet.</p>
          ) : (
            reviews.page.map((log) => <ReviewCard key={log._id} log={log} />)
          )}
        </section>
      </div>

      <aside>
        <SectionTitle more={<Link to="/u/$username/diary" params={params} className="hover:text-ink">Diary</Link>}>
          Recently brewed
        </SectionTitle>
        {recent === undefined ? (
          <PosterSkeletons count={4} />
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-4">
            {recent.map((log) => (
              <Link key={log._id} to="/reviews/$logId" params={{ logId: log._id }} className="group min-w-0" title={log.bean.name}>
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
