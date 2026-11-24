import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import {
  useSignInWithUsernamePasskey,
  type SignInWithUsernamePasskeyResult,
} from '@convex-dev/auth/methods/username-passkey/react'
import { Fingerprint } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import { HANDLE_PATTERN } from '@convex/lib/constants'
import { ErrorText } from '~/components/ui'

export const Route = createFileRoute('/signin')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: 'Sign in · Crema' }] }),
  component: SignIn,
})

type UserError = Extract<SignInWithUsernamePasskeyResult, { status: 'error' }>['userError']

function describe(err: UserError): string | null {
  switch (err.error) {
    case 'ALREADY_PENDING':
      return 'Already waiting for your passkey — check your browser prompt.'
    case 'USERNAME_TOO_SHORT':
    case 'USERNAME_TOO_LONG':
    case 'USERNAME_HAS_SURROUNDING_WHITESPACE':
    case 'USERNAME_HAS_INVALID_CHARACTERS':
      return 'Usernames are 2–24 letters, numbers, or underscores.'
    case 'USERNAME_TAKEN':
      return 'That username is taken.'
    case 'CHALLENGE_EXPIRED':
      return 'That took a little too long. Please try again.'
    case 'UNKNOWN_CREDENTIAL':
      return "That passkey doesn't belong to this username. Try another passkey or username."
    case 'PASSKEY_ALREADY_REGISTERED':
      return 'This device already has a passkey for another Crema account.'
    case 'CEREMONY_ABORTED':
      return null // The user closed the browser prompt; nothing to report.
    case 'WEBAUTHN_UNSUPPORTED':
      return "This browser doesn't support passkeys. Try an up-to-date Chrome, Safari, Edge or Firefox."
    case 'PROTOCOL_ERROR':
    case 'OTHER_ERROR':
      return 'Something went wrong with the passkey. Please try again.'
    default:
      err satisfies never
      return 'Something went wrong. Please try again.'
  }
}

function safeRedirect(target: string | undefined): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

function SignIn() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn, pending, autofill } = useSignInWithUsernamePasskey(api.auth)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Covers visiting /signin while signed in, and passkey-autofill sign-ins.
  // A submitted form navigates on its own (sign-ups go to the welcome screen).
  const submitted = useRef(false)
  useEffect(() => {
    if (isAuthenticated && !submitted.current) {
      void navigate({ href: safeRedirect(redirect), replace: true })
    }
  }, [isAuthenticated, navigate, redirect])

  const autofillError = autofill.lastError ? describe(autofill.lastError) : null

  // Don't offer the form until we know whether a session is being restored:
  // signing up while an old session loads in the background can leave the
  // client holding the old account's token.
  if (isLoading || (isAuthenticated && !submitted.current)) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-dim">
        {isAuthenticated ? 'You’re already signed in. Redirecting…' : 'Checking your session…'}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-center font-display text-3xl">Welcome to Crema</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Sign in or create an account with just a username.
      </p>

      <form
        className="card mt-8 space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          const name = username.trim()
          if (!HANDLE_PATTERN.test(name)) {
            setError('Usernames are 2–24 letters, numbers, or underscores.')
            return
          }
          submitted.current = true
          const result = await signIn({ username: name })
          if (result.status === 'error') {
            submitted.current = false
            setError(describe(result.userError))
            return
          }
          if (result.flow === 'signUp') {
            void navigate({ to: '/settings', search: { welcome: true } })
          } else {
            void navigate({ href: safeRedirect(redirect) })
          }
        }}
      >
        <div>
          <label htmlFor="username" className="label">
            Username
          </label>
          <input
            id="username"
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username webauthn"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={pending}
            placeholder="e.g. pourover_pal"
          />
        </div>
        <ErrorText>{error ?? autofillError}</ErrorText>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={pending}>
          <Fingerprint className="size-4" />
          {pending ? 'Waiting for your passkey…' : 'Continue with a passkey'}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-sm text-muted">
        <p>
          <strong className="text-ink">New here?</strong> Pick a username and your device will
          create a passkey for it.
        </p>
        <p>
          <strong className="text-ink">Coming back?</strong> Enter your username, or pick your
          account from the suggestions in the field.
        </p>
        <p className="text-xs text-dim">
          Passkeys replace passwords: you unlock them with your fingerprint, face, or device PIN,
          and they sync through your Apple, Google, or Microsoft account.
        </p>
      </div>
    </div>
  )
}
