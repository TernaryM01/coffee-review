import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Link from 'next/link'
import { Header, Logo } from '~/components/Header'
import { ConvexAuthNextjsServerProvider } from '~/lib/convexAuth'
import { preloadMe } from '~/lib/server'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['opsz'] })

export const metadata: Metadata = {
  title: { default: 'Crema — a diary for the coffee you brew', template: '%s · Crema' },
  description:
    'Log every bag you brew, rate and review coffee beans, keep a wishlist, and follow friends with good taste.',
  icons: { icon: '/favicon.svg' },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = { themeColor: '#15110e' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        {/* No <Suspense> around this (the Convex Auth docs add one for Cache
            Components, which this app doesn't use): a Suspense boundary here
            starts streaming early, which commits a 200 status before pages can
            call notFound(). */}
        <ConvexAuthNextjsServerProvider>
          <App>{children}</App>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}

async function App({ children }: { children: React.ReactNode }) {
  // Preloading the viewer on the server means the header (and everything
  // using useMe) renders signed-in on first paint.
  const preloadedMe = await preloadMe()
  return (
    <Providers preloadedMe={preloadedMe}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </Providers>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-dim">
        <div className="flex items-center gap-4">
          <Logo />
          <span>A diary for the coffee you brew.</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/beans" className="hover:text-ink">
            Beans
          </Link>
          <Link href="/roasters" className="hover:text-ink">
            Roasters
          </Link>
          <Link href="/lists" className="hover:text-ink">
            Lists
          </Link>
          <Link href="/beans/new" className="hover:text-ink">
            Add a bean
          </Link>
        </nav>
      </div>
    </footer>
  )
}
