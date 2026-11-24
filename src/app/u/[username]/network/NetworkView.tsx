'use client'

import type { FunctionReturnType } from 'convex/server'
import type { Preloaded } from 'convex/react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { FollowButton } from '~/components/FollowButton'
import { Avatar, SectionTitle } from '~/components/ui'
import { usePreloaded } from '~/lib/hooks'

type Person = NonNullable<FunctionReturnType<typeof api.follows.network>>['following'][number]

export function NetworkView({ preloaded }: { preloaded: Preloaded<typeof api.follows.network> }) {
  const network = usePreloaded(preloaded)
  if (!network) return null
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <People title={`Following · ${network.following.length}`} people={network.following} empty="Not following anyone yet." />
      <People title={`Followers · ${network.followers.length}`} people={network.followers} empty="No followers yet." />
    </div>
  )
}

function People({ title, people, empty }: { title: string; people: Person[]; empty: string }) {
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
              <Link href={`/u/${p.username}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold hover:text-crema">{p.name ?? p.username}</span>
                <span className="block truncate text-xs text-dim">@{p.username}</span>
              </Link>
              <FollowButton userId={p._id} initial={p.followStatus} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
