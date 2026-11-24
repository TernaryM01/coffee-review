import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { FollowButton } from '~/components/FollowButton'
import { NotFound } from '~/components/States'
import { Avatar, Stat } from '~/components/ui'
import { compact } from '~/lib/format'
import { useMe } from '~/lib/hooks'

import { profileQuery } from '~/lib/queries'

export const Route = createFileRoute('/u/$username')({
  loader: async ({ context: { queryClient }, params }) => {
    const user = await queryClient.ensureQueryData(profileQuery(params.username))
    return { title: user ? (user.name ?? user.username) : 'Not found' }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? 'Profile'} · Crema` }] }),
  component: ProfileLayout,
})

const TABS = [
  { to: '/u/$username', label: 'Profile', exact: true },
  { to: '/u/$username/diary', label: 'Diary' },
  { to: '/u/$username/reviews', label: 'Reviews' },
  { to: '/u/$username/beans', label: 'Beans' },
  { to: '/u/$username/likes', label: 'Likes' },
  { to: '/u/$username/wishlist', label: 'Wishlist' },
  { to: '/u/$username/lists', label: 'Lists' },
  { to: '/u/$username/network', label: 'Network' },
] as const

function ProfileLayout() {
  const { username } = Route.useParams()
  const { data: user } = useSuspenseQuery(profileQuery(username))
  const me = useMe()
  if (!user) return <NotFound what="member" />
  const isMe = me?._id === user._id
  const params = { username: user.username }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <Avatar user={user} size={88} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold">{user.name ?? user.username}</h1>
              {isMe ? (
                <Link to="/settings" className="btn-ghost px-3 py-1 text-xs uppercase tracking-wider">
                  Edit profile
                </Link>
              ) : (
                <FollowButton userId={user._id} />
              )}
            </div>
            <p className="text-sm text-dim">@{user.username}</p>
            {user.bio && <p className="mt-2 max-w-xl text-sm text-ink/90">{user.bio}</p>}
            {user.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <MapPin className="size-3.5" /> {user.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-6 md:gap-0 md:divide-x md:divide-line [&>*]:md:px-5">
          <Link to="/u/$username/diary" params={params}>
            <Stat value={compact(user.stats.logs)} label="Brews" />
          </Link>
          <Link to="/u/$username/beans" params={params}>
            <Stat value={compact(user.stats.beans)} label="Beans" />
          </Link>
          <Link to="/u/$username/lists" params={params}>
            <Stat value={compact(user.stats.lists)} label="Lists" />
          </Link>
          <Link to="/u/$username/network" params={params}>
            <Stat value={compact(user.stats.following)} label="Following" />
          </Link>
          <Link to="/u/$username/network" params={params}>
            <Stat value={compact(user.stats.followers)} label="Followers" />
          </Link>
        </div>
      </div>

      <nav className="mt-8 flex gap-1 overflow-x-auto border-y border-line py-1">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            params={params}
            activeOptions={{ exact: 'exact' in t }}
            className="whitespace-nowrap rounded px-3 py-1.5 text-sm text-muted hover:text-ink [&.active]:bg-raised [&.active]:text-ink"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
