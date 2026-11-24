import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Coffee } from 'lucide-react'

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <Coffee className="mx-auto mb-4 size-10 text-dim" aria-hidden />
      <h1 className="font-display text-3xl">Spilled.</h1>
      <p className="mt-2 text-muted">We couldn't find that {what}.</p>
      <Link to="/" className="btn-ghost mt-6">
        Back home
      </Link>
    </div>
  )
}

export function ErrorState({ error, reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button className="btn-ghost mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
}

export function PosterSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="aspect-[2/3] animate-pulse rounded-md bg-raised" />
      ))}
    </div>
  )
}

export function LineSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-md bg-raised" />
      ))}
    </div>
  )
}
