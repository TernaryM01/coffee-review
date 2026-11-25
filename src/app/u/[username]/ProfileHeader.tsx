'use client'

import { useMutation, type Preloaded } from 'convex/react'
import { MapPin, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { FollowStatus } from '@convex/follows'
import { FollowButton } from '~/components/FollowButton'
import { Avatar, ErrorText, Stat } from '~/components/ui'
import { compact, errorMessage } from '~/lib/format'
import { useMe, usePreloaded } from '~/lib/hooks'

const TABS = [
  { path: '', label: 'Profile' },
  { path: '/diary', label: 'Diary' },
  { path: '/reviews', label: 'Reviews' },
  { path: '/beans', label: 'Beans' },
  { path: '/likes', label: 'Likes' },
  { path: '/wishlist', label: 'Wishlist' },
  { path: '/lists', label: 'Lists' },
  { path: '/network', label: 'Network' },
] as const

export function ProfileHeader({
  preloaded,
  followStatus,
}: {
  preloaded: Preloaded<typeof api.users.byUsername>
  followStatus: FollowStatus
}) {
  const user = usePreloaded(preloaded)
  const me = useMe()
  const pathname = usePathname()
  if (!user) return null
  const isMe = me?._id === user._id
  const base = `/u/${user.username}`

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <Avatar user={user} size={88} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold">{user.name ?? user.username}</h1>
              {isMe ? (
                <Link href="/settings" className="btn-ghost px-3 py-1 text-xs uppercase tracking-wider">
                  Edit profile
                </Link>
              ) : (
                <FollowButton userId={user._id} initial={followStatus} />
              )}
            </div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-dim">
              @{user.username}
              {user.isAdmin && (
                <span className="rounded border border-crema/40 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-crema">
                  Admin
                </span>
              )}
            </p>
            {me?.isAdmin && !isMe && <AdminRole userId={user._id} isAdmin={user.isAdmin} username={user.username} />}
            {user.bio && <p className="mt-2 max-w-xl text-sm text-ink/90">{user.bio}</p>}
            {user.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <MapPin className="size-3.5" /> {user.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-6 md:gap-0 md:divide-x md:divide-line [&>*]:md:px-5">
          <Link href={`${base}/diary`}>
            <Stat value={compact(user.stats.logs)} label="Brews" />
          </Link>
          <Link href={`${base}/beans`}>
            <Stat value={compact(user.stats.beans)} label="Beans" />
          </Link>
          <Link href={`${base}/lists`}>
            <Stat value={compact(user.stats.lists)} label="Lists" />
          </Link>
          <Link href={`${base}/network`}>
            <Stat value={compact(user.stats.following)} label="Following" />
          </Link>
          <Link href={`${base}/network`}>
            <Stat value={compact(user.stats.followers)} label="Followers" />
          </Link>
        </div>
      </div>

      <nav className="mt-8 flex gap-1 overflow-x-auto border-y border-line py-1">
        {TABS.map((t) => {
          const href = base + t.path
          // Case-insensitive: usernames resolve regardless of case in the URL.
          const active = pathname.toLowerCase() === href.toLowerCase()
          return (
            <Link
              key={t.path}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-sm hover:text-ink ${active ? 'bg-raised text-ink' : 'text-muted'}`}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

/** Shown to admins on other people's profiles: grant or remove admin, with a confirm step. */
function AdminRole({ userId, isAdmin, username }: { userId: Id<'users'>; isAdmin: boolean; username: string }) {
  const setRole = useMutation(api.admin.setRoleOf)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = async () => {
    setError(null)
    setSaving(true)
    try {
      await setRole({ userId, admin: !isAdmin })
      setConfirming(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">
            {isAdmin
              ? `Remove @${username}'s admin role?`
              : `Make @${username} an admin? They'll be able to edit and delete any bean, and manage admins.`}
          </span>
          <button className={isAdmin ? 'btn-danger px-2.5 py-1 text-xs' : 'btn-primary px-2.5 py-1 text-xs'} disabled={saving} onClick={apply}>
            {saving ? 'Saving…' : isAdmin ? 'Remove admin' : 'Make admin'}
          </button>
          <button className="btn-ghost px-2.5 py-1 text-xs" disabled={saving} onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="inline-flex items-center gap-1 text-dim hover:text-ink"
          onClick={() => setConfirming(true)}
        >
          <ShieldCheck className="size-3.5" /> {isAdmin ? 'Remove admin role…' : 'Make admin…'}
        </button>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
