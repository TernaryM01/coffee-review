'use client'

import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '@convex/_generated/api'
import { BeanForm, emptyBean } from '~/components/BeanForm'

export function NewBeanForm() {
  const create = useMutation(api.beans.create)
  const router = useRouter()
  return (
    <BeanForm
      initial={emptyBean}
      submitLabel="Add bean"
      onSubmit={async ({ removeImage, ...values }) => {
        const beanId = await create(values)
        router.push(`/beans/${beanId}`)
      }}
    />
  )
}
