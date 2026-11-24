import type { Metadata } from 'next'
import { NewBeanForm } from './NewBeanForm'

export const metadata: Metadata = { title: 'Add a bean' }

// Signed-in only (see src/proxy.ts).
export default function NewBeanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl">Add a bean</h1>
      <p className="mt-1 text-sm text-muted">
        Can't find a coffee? Add it so you (and everyone else) can log it. Search first to avoid duplicates.
      </p>
      <div className="mt-8">
        <NewBeanForm />
      </div>
    </div>
  )
}
