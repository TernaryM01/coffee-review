import { setupConvexAuthNextjs } from '@convex-dev/auth/ssr/nextjs'
import { api } from '@convex/_generated/api'

// Next.js-specific auth helpers: the proxy (refreshes sessions before each
// page request), the Server Component token reader, and the provider that
// hands the session to the client.
export const {
  convexAuthNextjsProxy,
  nextjsProxyRedirect,
  convexAuthNextjsAccessToken,
  isAuthenticatedNextjs,
  ConvexAuthNextjsServerProvider,
} = setupConvexAuthNextjs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  refreshSession: api.auth.refreshSession,
  isAuthenticated: api.auth.isAuthenticated,
})
