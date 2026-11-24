'use client'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        {process.env.NODE_ENV === 'development' ? error.message : 'Please try again in a moment.'}
      </p>
      <button className="btn-ghost mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  )
}
