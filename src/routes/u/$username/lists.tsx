import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { ListCard } from '~/components/ListCard'
import { EmptyState, LineSkeletons } from '~/components/States'
import { useMe } from '~/lib/hooks'

export const Route = createFileRoute('/u/$username/lists')({
  component: UserLists,
})

function UserLists() {
  const { username } = Route.useParams()
  const lists = useQuery(api.lists.forUser, { username })
  const me = useMe()
  const isMe = me?.username.toLowerCase() === username.toLowerCase()

  return (
    <div>
      {isMe && (
        <div className="mb-6">
          <Link to="/lists/new" className="btn-primary">
            <Plus className="size-4" /> New list
          </Link>
        </div>
      )}
      {lists === undefined ? (
        <LineSkeletons />
      ) : lists.length === 0 ? (
        <EmptyState title="No lists yet">
          {isMe && 'Group beans however you like: best naturals, holiday gifts, roasters to try…'}
        </EmptyState>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {lists.map((l) => (
            <ListCard key={l._id} list={l} />
          ))}
        </div>
      )}
    </div>
  )
}
