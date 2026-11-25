import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Privacy policy' }

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 text-sm leading-relaxed text-muted">
      <h1 className="font-display text-3xl text-ink">Privacy policy</h1>
      <p>
        Crema is a small, non-commercial diary for the coffee you brew. This page explains what it stores about you and
        why.
      </p>

      <Section title="Signing in with Google">
        <p>
          When you sign in, Google tells Crema your Google account ID, name, email address, and profile picture. Crema
          keeps only:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>your Google account ID, to recognize you the next time you sign in, and</li>
          <li>your name, as your starting display name, which you can change in Settings.</li>
        </ul>
        <p>Your email address and Google profile picture are not stored or shown to anyone.</p>
      </Section>

      <Section title="What you add">
        <p>
          Your username, profile (display name, bio, location, photo, favorite beans), diary entries, ratings, reviews,
          likes, wishlist, lists, the people you follow, and the beans and photos you add are stored so Crema can show
          them. They are <strong className="text-ink">public</strong>: anyone can see them on your profile and on bean
          pages.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Crema sets cookies only to keep you signed in. There are no ads, no analytics, and no tracking, and your data
          is never sold or shared.
        </p>
      </Section>

      <Section title="Where it's stored">
        <p>
          Data is stored with <a href="https://www.convex.dev" className="text-crema hover:underline">Convex</a> (the
          database), and the website is served by{' '}
          <a href="https://vercel.com" className="text-crema hover:underline">Vercel</a>.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          You can edit or delete your diary entries, reviews, and lists at any time. To delete your whole account, ask
          the person who runs this Crema site.
        </p>
      </Section>

      <p>
        See also the <Link href="/terms" className="text-crema hover:underline">terms of use</Link>.
      </p>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {children}
    </section>
  )
}
