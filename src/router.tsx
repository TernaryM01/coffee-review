import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { api } from '@convex/_generated/api'
import { routeTree } from './routeTree.gen'
import { ErrorState, NotFound } from './components/States'

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined
  if (!CONVEX_URL) {
    throw new Error(
      'Missing VITE_CONVEX_URL. Run `bun run dev` (which starts Convex) or set it in your environment.',
    )
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0, // Let React Query handle all caching
    defaultErrorComponent: ErrorState,
    defaultNotFoundComponent: () => <NotFound />,
    Wrap: ({ children }) => (
      <ConvexAuthProvider
        client={convexQueryClient.convexClient}
        api={{
          refreshSession: api.auth.refreshSession,
          signOut: api.auth.signOut,
          isAuthenticated: api.auth.isAuthenticated,
        }}
      >
        {children}
      </ConvexAuthProvider>
    ),
  })
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}
