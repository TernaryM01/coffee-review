'use client'

import { useMutation } from 'convex/react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { BeanForm, type BeanFormValues } from '~/components/BeanForm'
import { ErrorText, SectionTitle } from '~/components/ui'
import { errorMessage } from '~/lib/format'

type Deletable = { logCount: number; brewerCount: number }

export function EditBeanForm({
  beanId,
  initial,
  deletable,
}: {
  beanId: Id<'beans'>
  initial: BeanFormValues
  /** Set for admins, who may delete the bean. */
  deletable: Deletable | null
}) {
  const update = useMutation(api.beans.update)
  const router = useRouter()
  return (
    <>
      <BeanForm
        submitLabel="Save changes"
        initial={initial}
        onSubmit={async (values) => {
          await update({ beanId, ...values })
          router.push(`/beans/${beanId}`)
        }}
      />
      {deletable && <DeleteBean beanId={beanId} name={initial.name} {...deletable} />}
    </>
  )
}

function DeleteBean({ beanId, name, logCount, brewerCount }: { beanId: Id<'beans'>; name: string } & Deletable) {
  const remove = useMutation(api.beans.remove)
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="mt-16 rounded-lg border border-cherry/30 p-5">
      <SectionTitle>Delete bean</SectionTitle>
      <p className="text-sm text-muted">
        Removes {name} from Crema for everyone. Everyone&apos;s diary entries
        {logCount > 0 && ` (${logCount === 1 ? '1 entry' : `${logCount} entries`}`}
        {logCount > 0 && brewerCount > 0 && `, from ${brewerCount === 1 ? '1 person' : `${brewerCount} people`}`}
        {logCount > 0 && ')'}, ratings, likes, wishlist entries, and list entries for it are deleted too. This
        can&apos;t be undone.
      </p>
      <ErrorText>{error}</ErrorText>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              className="btn-danger"
              disabled={deleting}
              onClick={async () => {
                setError(null)
                setDeleting(true)
                try {
                  await remove({ beanId })
                  router.replace('/beans')
                  router.refresh()
                } catch (err) {
                  setError(errorMessage(err))
                  setDeleting(false)
                }
              }}
            >
              <Trash2 className="size-4" /> {deleting ? 'Deleting…' : `Yes, delete ${name}`}
            </button>
            <button className="btn-ghost" disabled={deleting} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="btn-danger" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" /> Delete this bean…
          </button>
        )}
      </div>
    </section>
  )
}
