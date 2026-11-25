import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms of use' }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed text-muted">
      <h1 className="font-display text-3xl text-ink">Terms of use</h1>
      <p>Crema is a free, non-commercial hobby project for sharing notes about coffee. By using it, you agree to this:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          What you post (reviews, photos, beans, lists) is public. Only post things you have the right to share, and
          nothing illegal, hateful, or spammy.
        </li>
        <li>The site&apos;s owner may remove content or accounts that break these rules.</li>
        <li>
          Crema is provided as is, with no guarantees. It may change, lose data, or shut down, so keep your own copy of
          anything important.
        </li>
      </ul>
      <p>
        How your data is handled is described in the{' '}
        <Link href="/privacy" className="text-crema hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </article>
  )
}
