import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import appCss from '../styles/app.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Header, Logo } from '~/components/Header'
import { LogProvider } from '~/components/LogDialog'
import { NotFound } from '~/components/States'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Crema — a diary for the coffee you brew' },
      {
        name: 'description',
        content:
          'Log every bag you brew, rate and review coffee beans, keep a wishlist, and follow friends with good taste.',
      },
      { name: 'theme-color', content: '#15110e' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <LogProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </LogProvider>
    </RootDocument>
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
          <Link to="/beans" className="hover:text-ink">
            Beans
          </Link>
          <Link to="/roasters" className="hover:text-ink">
            Roasters
          </Link>
          <Link to="/lists" className="hover:text-ink">
            Lists
          </Link>
          <Link to="/beans/new" className="hover:text-ink">
            Add a bean
          </Link>
        </nav>
      </div>
    </footer>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
