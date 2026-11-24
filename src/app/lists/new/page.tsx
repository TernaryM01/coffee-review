import type { Metadata } from 'next'
import { NewListForm } from './NewListForm'

export const metadata: Metadata = { title: 'New list' }

// Signed-in only (see src/proxy.ts).
export default function NewListPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 font-display text-3xl">New list</h1>
      <NewListForm />
    </div>
  )
}
