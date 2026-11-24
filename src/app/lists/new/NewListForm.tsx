'use client'

import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '@convex/_generated/api'
import { ListForm } from '~/components/ListForm'

export function NewListForm() {
  const create = useMutation(api.lists.create)
  const router = useRouter()
  return (
    <ListForm
      initial={{ title: '', description: '', ranked: false }}
      submitLabel="Create list"
      onSubmit={async (values) => {
        const listId = await create(values)
        router.push(`/lists/${listId}`)
      }}
    />
  )
}
