import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'
import { FollowButton } from '~/components/FollowButton'
import { EmptyState } from '~/components/States'
import { Avatar } from '~/components/ui'
import { plural } from '~/lib/format'

const membersQ = convexQuery(api.users.popular, {})

export const Route = createFileRoute('/members')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(membersQ),
  head: () => ({ meta: [{ title: 'Members · Crema' }] }),
  component: Members,
})

function Members() {
  const { data: members } = useSuspenseQuery(membersQ)
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl">Members</h1>
      <p className="mb-6 text-sm text-muted">Popular coffee people. Follow them to fill your feed.</p>
      {members.length === 0 ? (
        <EmptyState title="No members yet">You could be the first.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m._id} className="flex items-center gap-4 py-3">
              <Link to="/u/$username" params={{ username: m.username }}>
                <Avatar user={m} size={44} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to="/u/$username" params={{ username: m.username }} className="font-semibold hover:text-crema">
                  {m.name ?? m.username}
                </Link>
                <p className="text-xs text-dim">
                  {plural(m.stats.followers, 'follower')} · {plural(m.stats.beans, 'bean')} ·{' '}
                  {plural(m.stats.reviews, 'review')}
                </p>
              </div>
              <FollowButton userId={m._id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
