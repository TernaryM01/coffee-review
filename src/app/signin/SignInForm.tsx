'use client'

import { useOauth, useSignInWithGoogle, type OauthFlowError } from '@convex-dev/auth/methods/google/react'
import { useConvexAuth } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { api } from '@convex/_generated/api'
import { ErrorText } from '~/components/ui'
import { useMe } from '~/lib/hooks'

const noSubscribe = () => () => {}

/** Accounts created this recently count as new: they land on the welcome screen. */
const NEW_ACCOUNT_MS = 5 * 60 * 1000

/** Errors after Google sent the browser back here. */
function describeFlowError(err: OauthFlowError): string | null {
  switch (err.error) {
    case 'ACCESS_DENIED':
      return null // The user cancelled at Google; nothing to report.
    case 'EXPIRED':
    case 'INVALID_FLOW':
      return 'That sign-in took too long or was already used. Please try again.'
    case 'OTHER_ERROR':
      console.error('Google sign-in failed', err.cause)
      return 'Something went wrong signing in with Google. Please try again.'
    default:
      err satisfies never
      return 'Something went wrong. Please try again.'
  }
}

export function SignInForm({ redirect }: { redirect: string }) {
  const router = useRouter()
  const me = useMe()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useSignInWithGoogle(api.auth)
  const { flowError } = useOauth()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Before hydration the button can't do anything yet.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  )

  // Google sends the browser back to this page, which finishes the sign-in.
  // Once signed in, move on: new accounts go to the welcome screen.
  useEffect(() => {
    if (!isAuthenticated) return
    const go = (to: string) => {
      router.replace(to)
      router.refresh() // re-render Server Components with the new session cookie
    }
    if (me) {
      go(Date.now() - me.joinedAt < NEW_ACCOUNT_MS ? '/settings?welcome=1' : redirect)
      return
    }
    // The profile normally arrives within a moment; don't wait on it forever.
    const t = setTimeout(() => go(redirect), 3000)
    return () => clearTimeout(t)
  }, [isAuthenticated, me, redirect, router])

  const busy = starting || isLoading || isAuthenticated
  const flowMessage = flowError ? describeFlowError(flowError) : null

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-center font-display text-3xl">Welcome to Crema</h1>
      <p className="mt-2 text-center text-sm text-muted">Sign in or create an account with your Google account.</p>

      <div className="card mt-8 space-y-4 p-6">
        <ErrorText>{error ?? flowMessage}</ErrorText>
        <button
          type="button"
          className="btn-primary w-full py-2.5"
          disabled={busy || !hydrated}
          onClick={async () => {
            setError(null)
            setStarting(true)
            // Google returns here; keep where the visitor was headed.
            const back = new URL('/signin', window.location.origin)
            if (redirect !== '/') back.searchParams.set('redirect', redirect)
            const result = await signIn({ redirectTo: back.toString() })
            if (result.status === 'error') {
              console.error('Google sign-in failed to start', result.userError.cause)
              setError('Couldn’t reach Google sign-in. Please try again.')
              setStarting(false)
            }
            // Otherwise the browser is on its way to Google.
          }}
        >
          <GoogleIcon />
          {starting ? 'Opening Google…' : isAuthenticated || isLoading ? 'Signing you in…' : 'Continue with Google'}
        </button>
      </div>

      <div className="mt-6 space-y-2 text-sm text-muted">
        <p>
          <strong className="text-ink">New here?</strong> Your account is created the first time you sign in. You
          can change your username and display name in Settings.
        </p>
        <p className="text-xs text-dim">
          Crema only receives your name, email address, and profile picture from Google. Your email isn&apos;t shown to
          anyone.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}
