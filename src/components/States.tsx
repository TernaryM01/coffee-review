import Link from 'next/link'
import { Coffee } from 'lucide-react'

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <Coffee className="mx-auto mb-4 size-10 text-dim" aria-hidden />
      <h1 className="font-display text-3xl">Spilled.</h1>
      <p className="mt-2 text-muted">We couldn't find that {what}.</p>
      <Link href="/" className="btn-ghost mt-6">
        Back home
      </Link>
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
