import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { BeanForm, emptyBean } from '~/components/BeanForm'
import { useMe } from '~/lib/hooks'

export const Route = createFileRoute('/beans/new')({
  head: () => ({ meta: [{ title: 'Add a bean · Crema' }] }),
  component: NewBean,
})

function NewBean() {
  const me = useMe()
  const create = useMutation(api.beans.create)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl">Add a bean</h1>
      <p className="mt-1 text-sm text-muted">
        Can't find a coffee? Add it so you (and everyone else) can log it. Search first to avoid
        duplicates.
      </p>
      <div className="mt-8">
        {me === undefined ? null : me === null ? (
          <p className="text-muted">
            <Link to="/signin" search={{ redirect: '/beans/new' }} className="text-crema hover:underline">
              Sign in
            </Link>{' '}
            to add beans.
          </p>
        ) : (
          <BeanForm
            initial={emptyBean}
            submitLabel="Add bean"
            onSubmit={async ({ removeImage: _unused, ...values }) => {
              const beanId = await create(values)
              await navigate({ to: '/beans/$beanId', params: { beanId } })
            }}
          />
        )}
      </div>
    </div>
  )
}
