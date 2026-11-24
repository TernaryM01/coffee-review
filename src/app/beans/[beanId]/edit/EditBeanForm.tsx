'use client'

import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { BeanForm, type BeanFormValues } from '~/components/BeanForm'

export function EditBeanForm({ beanId, initial }: { beanId: Id<'beans'>; initial: BeanFormValues }) {
  const update = useMutation(api.beans.update)
  const router = useRouter()
  return (
    <BeanForm
      submitLabel="Save changes"
      initial={initial}
      onSubmit={async (values) => {
        await update({ beanId, ...values })
        router.push(`/beans/${beanId}`)
      }}
    />
  )
}
