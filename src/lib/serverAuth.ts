import { setupConvexAuthServer } from '@convex-dev/auth/ssr'
import { api } from '@convex/_generated/api'

// Framework-agnostic auth handlers, mounted by the route files under
// src/app/auth/. The sign-in route only forwards functions listed in `signIn`:
// every function that creates a session must be here.
export const auth = setupConvexAuthServer({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  refreshSession: api.auth.refreshSession,
  signOut: api.auth.signOut,
  signIn: [api.auth.completeSignInWithGoogle],
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
})
