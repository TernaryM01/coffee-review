import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ListForm } from '~/components/ListForm'
import { useMe } from '~/lib/hooks'

export const Route = createFileRoute('/lists/new')({
  head: () => ({ meta: [{ title: 'New list · Crema' }] }),
  component: NewList,
})

function NewList() {
  const me = useMe()
  const create = useMutation(api.lists.create)
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 font-display text-3xl">New list</h1>
      {me === undefined ? null : me === null ? (
        <p className="text-muted">
          <Link to="/signin" search={{ redirect: '/lists/new' }} className="text-crema hover:underline">
            Sign in
          </Link>{' '}
          to make lists.
        </p>
      ) : (
        <ListForm
          initial={{ title: '', description: '', ranked: false }}
          submitLabel="Create list"
          onSubmit={async (values) => {
            const listId = await create(values)
            await navigate({ to: '/lists/$listId', params: { listId } })
          }}
        />
      )}
    </div>
  )
}
