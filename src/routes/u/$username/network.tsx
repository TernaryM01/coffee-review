import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Profile } from '@convex/lib/hydrate'
import { FollowButton } from '~/components/FollowButton'
import { LineSkeletons } from '~/components/States'
import { Avatar, SectionTitle } from '~/components/ui'

export const Route = createFileRoute('/u/$username/network')({
  component: Network,
})

function Network() {
  const { username } = Route.useParams()
  const network = useQuery(api.follows.network, { username })
  if (network === undefined) return <LineSkeletons />
  if (network === null) return null
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <People title={`Following · ${network.following.length}`} people={network.following} empty="Not following anyone yet." />
      <People title={`Followers · ${network.followers.length}`} people={network.followers} empty="No followers yet." />
    </div>
  )
}

function People({ title, people, empty }: { title: string; people: Profile[]; empty: string }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {people.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map((p) => (
            <li key={p._id} className="flex items-center gap-3 py-2.5">
              <Avatar user={p} size={36} />
              <Link to="/u/$username" params={{ username: p.username }} className="min-w-0 flex-1">
                <span className="block truncate font-semibold hover:text-crema">{p.name ?? p.username}</span>
                <span className="block truncate text-xs text-dim">@{p.username}</span>
              </Link>
              <FollowButton userId={p._id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
