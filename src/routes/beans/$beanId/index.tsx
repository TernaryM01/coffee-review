import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { Bookmark, Coffee, Heart, ListPlus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import type { BeanCard } from '@convex/lib/hydrate'
import { AddToListDialog } from '~/components/AddToListDialog'
import { BeanPoster } from '~/components/BeanPoster'
import { ListCard } from '~/components/ListCard'
import { useLog } from '~/components/LogDialog'
import { RatingHistogram, RatingInput, Stars } from '~/components/Rating'
import { ReviewCard } from '~/components/ReviewCard'
import { EmptyState, LineSkeletons, NotFound } from '~/components/States'
import { Avatar, SectionTitle } from '~/components/ui'
import { altitude, compact, errorMessage, formatDate, plural } from '~/lib/format'
import { useMe, useRequireAuth } from '~/lib/hooks'

const beanQuery = (beanId: string) => convexQuery(api.beans.get, { beanId })

export const Route = createFileRoute('/beans/$beanId/')({
  loader: async ({ context: { queryClient }, params }) => {
    const bean = await queryClient.ensureQueryData(beanQuery(params.beanId))
    return { title: bean ? `${bean.name} — ${bean.roasterName}` : 'Bean not found' }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? 'Bean'} · Crema` }] }),
  component: BeanPage,
})

type Bean = NonNullable<ReturnType<typeof useBean>>
function useBean() {
  const { beanId } = Route.useParams()
  return useSuspenseQuery(beanQuery(beanId)).data
}

function toCard(bean: Bean): BeanCard {
  return {
    _id: bean._id,
    name: bean.name,
    roasterId: bean.roasterId,
    roasterName: bean.roasterName,
    origin: bean.origin,
    process: bean.process,
    roastLevel: bean.roastLevel,
    imageUrl: bean.imageUrl,
    ratingAvg: bean.ratingAvg,
    ratingCount: bean.ratingCount,
    brewerCount: bean.brewerCount,
  }
}

function BeanPage() {
  const bean = useBean()
  if (!bean) return <NotFound what="bean" />
  const card = toCard(bean)
  const alt = altitude(bean.altitudeMin, bean.altitudeMax)

  const details: [string, React.ReactNode][] = [
    ['Origin', [bean.origin, bean.region].filter(Boolean).join(' · ')],
    ['Producer', bean.producer],
    ['Variety', bean.varieties.join(', ')],
    ['Process', bean.process],
    ['Roast', bean.roastLevel],
    ['Altitude', alt],
    ['Harvest', bean.harvest],
  ]

  return (
    <div className="relative">
      {/* backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="mx-auto w-[120%] max-w-none -translate-y-1/3 scale-150 opacity-30 blur-3xl">
          <BeanPoster bean={card} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/70 to-bg" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-10 md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr_260px]">
        {/* poster column */}
        <div className="mx-auto w-44 md:w-full">
          <BeanPoster bean={card} className="shadow-2xl" />
          <div className="mt-4 flex justify-center gap-4 text-xs text-muted">
            <span title="People who've brewed this" className="flex items-center gap-1">
              <Coffee className="size-3.5 text-leaf" /> {compact(bean.brewerCount)}
            </span>
            <span title="Likes" className="flex items-center gap-1">
              <Heart className="size-3.5 text-cherry" /> {compact(bean.likeCount)}
            </span>
            <span title="On wishlists" className="flex items-center gap-1">
              <Bookmark className="size-3.5 text-sky" /> {compact(bean.wishlistCount)}
            </span>
          </div>
        </div>

        {/* main column */}
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-crema">
            {bean.roaster ? (
              <Link to="/roasters/$slug" params={{ slug: bean.roaster.slug }} className="hover:underline">
                {bean.roasterName}
              </Link>
            ) : (
              bean.roasterName
            )}
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold leading-tight sm:text-5xl">{bean.name}</h1>
          {bean.roaster?.location && <p className="mt-1 text-sm text-muted">Roasted in {bean.roaster.location}</p>}

          {bean.description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/90">{bean.description}</p>}

          {bean.roasterNotes.length > 0 && (
            <div className="mt-5">
              <p className="label">On the bag</p>
              <div className="flex flex-wrap gap-2">
                {bean.roasterNotes.map((n) => (
                  <span key={n} className="chip border-crema/30 text-sm text-ink">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <dl className="mt-6 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-5 text-sm">
            {details
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-xs uppercase tracking-wider text-dim">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
          </dl>
          {bean.creator && (
            <p className="mt-4 text-xs text-dim">
              Added by{' '}
              <Link to="/u/$username" params={{ username: bean.creator.username }} className="hover:text-ink">
                {bean.creator.name ?? bean.creator.username}
              </Link>
            </p>
          )}

          <div className="mt-10 space-y-10 lg:hidden">
            <ActionPanel bean={bean} card={card} />
            <div>
              <SectionTitle>Ratings</SectionTitle>
              <RatingHistogram histogram={bean.ratingHistogram} avg={bean.ratingAvg} count={bean.ratingCount} />
            </div>
          </div>

          <MyBrews beanId={bean._id} card={card} />
          <FriendsRatings beanId={bean._id} />
          <Reviews beanId={bean._id} />
          <InLists beanId={bean._id} />
        </div>

        {/* sidebar */}
        <aside className="hidden space-y-8 lg:block">
          <ActionPanel bean={bean} card={card} />
          <div>
            <SectionTitle>Ratings</SectionTitle>
            <RatingHistogram histogram={bean.ratingHistogram} avg={bean.ratingAvg} count={bean.ratingCount} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function ActionPanel({ bean, card }: { bean: Bean; card: BeanCard }) {
  const me = useMe()
  const mine = useQuery(api.userBeans.mine, me ? { beanId: bean._id } : 'skip')
  const setState = useMutation(api.userBeans.set)
  const requireAuth = useRequireAuth()
  const { openLog } = useLog()
  const [listsOpen, setListsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (args: Omit<Parameters<typeof setState>[0], 'beanId'>) =>
    requireAuth(() => {
      setError(null)
      setState({ beanId: bean._id, ...args }).catch((e) => setError(errorMessage(e)))
    })

  const toggle = 'flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition hover:bg-raised'

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="grid grid-cols-3 border-b border-line p-2">
        <button
          className={`${toggle} ${mine?.brewed ? 'text-leaf' : 'text-muted'}`}
          aria-pressed={mine?.brewed ?? false}
          onClick={run({ brewed: !mine?.brewed })}
        >
          <Coffee className="size-6" fill={mine?.brewed ? 'currentColor' : 'none'} fillOpacity={0.25} />
          {mine?.brewed ? 'Brewed' : 'Brew'}
        </button>
        <button
          className={`${toggle} ${mine?.liked ? 'text-cherry' : 'text-muted'}`}
          aria-pressed={mine?.liked ?? false}
          onClick={run({ liked: !mine?.liked })}
        >
          <Heart className="size-6" fill={mine?.liked ? 'currentColor' : 'none'} />
          {mine?.liked ? 'Liked' : 'Like'}
        </button>
        <button
          className={`${toggle} ${mine?.wishlisted ? 'text-sky' : 'text-muted'}`}
          aria-pressed={mine?.wishlisted ?? false}
          onClick={run({ wishlisted: !mine?.wishlisted })}
        >
          <Bookmark className="size-6" fill={mine?.wishlisted ? 'currentColor' : 'none'} />
          Wishlist
        </button>
      </div>
      <div className="flex flex-col items-center border-b border-line px-4 py-3">
        <span className="mb-1 text-xs text-dim">{mine?.rating ? 'Rated' : 'Rate'}</span>
        <RatingInput
          value={mine?.rating ?? null}
          onChange={(rating) => run({ rating })()}
          size={30}
        />
      </div>
      {error && <p className="border-b border-line px-4 py-2 text-xs text-cherry">{error}</p>}
      <button
        className="block w-full border-b border-line px-4 py-2.5 text-center text-sm text-muted hover:bg-raised hover:text-ink"
        onClick={requireAuth(() => openLog({ bean: card }))}
      >
        {mine?.brewCount ? 'Log another brew…' : 'Review or log…'}
      </button>
      <button
        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm text-muted hover:bg-raised hover:text-ink"
        onClick={requireAuth(() => setListsOpen(true))}
      >
        <ListPlus className="size-4" /> Add to lists…
      </button>
      {me && bean.createdBy === me._id && (
        <Link
          to="/beans/$beanId/edit"
          params={{ beanId: bean._id }}
          className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-2.5 text-sm text-muted hover:bg-raised hover:text-ink"
        >
          <Pencil className="size-4" /> Edit bean details
        </Link>
      )}
      {me && <AddToListDialog beanId={bean._id} open={listsOpen} onClose={() => setListsOpen(false)} />}
    </div>
  )
}

function MyBrews({ beanId, card }: { beanId: Id<'beans'>; card: BeanCard }) {
  const logs = useQuery(api.logs.mineForBean, { beanId })
  if (!logs || logs.length === 0) return null
  return (
    <section className="mt-12">
      <SectionTitle>Your brews</SectionTitle>
      <ul className="divide-y divide-line">
        {logs.map((log) => (
          <MyBrewRow key={log._id} log={log} card={card} />
        ))}
      </ul>
    </section>
  )
}

function MyBrewRow({ log, card }: { log: Doc<'logs'>; card: BeanCard }) {
  const { openLog } = useLog()
  const remove = useMutation(api.logs.remove)
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
      <Link to="/reviews/$logId" params={{ logId: log._id }} className="w-28 text-muted hover:text-ink">
        {formatDate(log.brewedOn)}
      </Link>
      <span className="w-20">{log.rating !== undefined && <Stars rating={log.rating} />}</span>
      <span className="flex-1 truncate text-dim">
        {[log.method, log.hasReview ? 'Reviewed' : null].filter(Boolean).join(' · ')}
      </span>
      {confirming ? (
        <span className="flex items-center gap-2 text-xs">
          Delete this entry?
          <button className="font-semibold text-cherry" onClick={() => void remove({ logId: log._id })}>
            Delete
          </button>
          <button className="text-muted" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </span>
      ) : (
        <span className="flex gap-1">
          <button className="rounded p-1 text-dim hover:text-ink" aria-label="Edit entry" onClick={() => openLog({ bean: card, log })}>
            <Pencil className="size-4" />
          </button>
          <button className="rounded p-1 text-dim hover:text-cherry" aria-label="Delete entry" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" />
          </button>
        </span>
      )}
    </li>
  )
}

function FriendsRatings({ beanId }: { beanId: Id<'beans'> }) {
  const friends = useQuery(api.userBeans.friendsForBean, { beanId })
  if (!friends || friends.length === 0) return null
  return (
    <section className="mt-12">
      <SectionTitle>Friends who've brewed it</SectionTitle>
      <div className="flex flex-wrap gap-4">
        {friends.map(({ user, rating, liked }) => (
          <Link key={user._id} to="/u/$username" params={{ username: user.username }} className="flex flex-col items-center gap-1" title={user.name ?? user.username}>
            <Avatar user={user} size={40} />
            <span className="text-xs">
              {rating ? <Stars rating={rating} /> : <span className="text-dim">—</span>}
              {liked && <span className="ml-0.5 text-cherry">♥</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Reviews({ beanId }: { beanId: Id<'beans'> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.logs.reviewsForBean, { beanId }, { initialNumItems: 10 })
  return (
    <section className="mt-12">
      <SectionTitle>Reviews</SectionTitle>
      {status === 'LoadingFirstPage' ? (
        <LineSkeletons />
      ) : results.length === 0 ? (
        <EmptyState title="No reviews yet">Brewed this? Be the first to say how it was.</EmptyState>
      ) : (
        <>
          {results.map((log) => (
            <ReviewCard key={log._id} log={log} showBean={false} />
          ))}
          {status !== 'Exhausted' && (
            <button className="btn-ghost mt-4" disabled={status === 'LoadingMore'} onClick={() => loadMore(10)}>
              More reviews
            </button>
          )}
        </>
      )}
    </section>
  )
}

function InLists({ beanId }: { beanId: Id<'beans'> }) {
  const lists = useQuery(api.lists.containingBean, { beanId })
  if (!lists || lists.length === 0) return null
  return (
    <section className="mt-12">
      <SectionTitle>Appears in {plural(lists.length, 'list')}</SectionTitle>
      <div className="grid gap-6 sm:grid-cols-2">
        {lists.map((l) => (
          <ListCard key={l._id} list={l} />
        ))}
      </div>
    </section>
  )
}
