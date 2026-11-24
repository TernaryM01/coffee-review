import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useRequireAuth } from '~/lib/hooks'

export function FollowButton({ userId }: { userId: Id<'users'> }) {
  const status = useQuery(api.follows.status, { userId })
  const setFollowing = useMutation(api.follows.setFollowing)
  const requireAuth = useRequireAuth()
  const [hover, setHover] = useState(false)

  if (!status || status.self) return null
  const following = status.following

  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={requireAuth(() => void setFollowing({ userId, following: !following }))}
      className={
        following
          ? `btn border ${hover ? 'border-cherry/50 text-cherry' : 'border-leaf/50 text-leaf'} px-3 py-1.5`
          : 'btn-primary px-3 py-1.5'
      }
    >
      {following ? (hover ? 'Unfollow' : 'Following') : 'Follow'}
    </button>
  )
}
