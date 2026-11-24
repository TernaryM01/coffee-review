import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { BeanForm } from '~/components/BeanForm'
import { NotFound } from '~/components/States'
import { useMe } from '~/lib/hooks'

export const Route = createFileRoute('/beans/$beanId/edit')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(convexQuery(api.beans.get, { beanId: params.beanId })),
  head: () => ({ meta: [{ title: 'Edit bean · Crema' }] }),
  component: EditBean,
})

function EditBean() {
  const { beanId } = Route.useParams()
  const { data: bean } = useSuspenseQuery(convexQuery(api.beans.get, { beanId }))
  const me = useMe()
  const update = useMutation(api.beans.update)
  const navigate = useNavigate()

  if (!bean) return <NotFound what="bean" />
  if (me === undefined) return null
  if (!me || bean.createdBy !== me._id) {
    return (
      <p className="mx-auto max-w-4xl px-4 py-16 text-muted">
        Only the person who added this bean can edit it.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl">Edit {bean.name}</h1>
      <BeanForm
        submitLabel="Save changes"
        initial={{
          roaster: { kind: 'existing', roasterId: bean.roasterId, name: bean.roasterName },
          name: bean.name,
          origin: bean.origin,
          region: bean.region ?? '',
          producer: bean.producer ?? '',
          varieties: bean.varieties,
          process: bean.process,
          roastLevel: bean.roastLevel,
          altitudeMin: bean.altitudeMin?.toString() ?? '',
          altitudeMax: bean.altitudeMax?.toString() ?? '',
          harvest: bean.harvest ?? '',
          roasterNotes: bean.roasterNotes,
          description: bean.description ?? '',
          imageUrl: bean.imageUrl,
        }}
        onSubmit={async (values) => {
          await update({ beanId: bean._id, ...values })
          await navigate({ to: '/beans/$beanId', params: { beanId: bean._id } })
        }}
      />
    </div>
  )
}
