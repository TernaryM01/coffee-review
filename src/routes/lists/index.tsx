import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { Plus } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { ListCard } from '~/components/ListCard'
import { EmptyState } from '~/components/States'
import { useRequireAuth } from '~/lib/hooks'
import { useNavigate } from '@tanstack/react-router'

const listsQ = convexQuery(api.lists.recent, { limit: 30 })

export const Route = createFileRoute('/lists/')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(listsQ),
  head: () => ({ meta: [{ title: 'Lists · Crema' }] }),
  component: Lists,
})

function Lists() {
  const { data: lists } = useSuspenseQuery(listsQ)
  const requireAuth = useRequireAuth()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Lists</h1>
          <p className="text-sm text-muted">Collections of beans, curated by the community.</p>
        </div>
        <button className="btn-primary" onClick={requireAuth(() => void navigate({ to: '/lists/new' }))}>
          <Plus className="size-4" /> Start a list
        </button>
      </div>
      {lists.length === 0 ? (
        <EmptyState title="No lists yet">
          <Link to="/lists/new" className="text-crema hover:underline">
            Make the first one
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <ListCard key={l._id} list={l} />
          ))}
        </div>
      )}
    </div>
  )
}
