import type { Metadata } from 'next'
import { safeRedirect } from '~/lib/redirect'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = { title: 'Sign in' }

// Signed-in visitors never get here: src/proxy.ts redirects them.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams
  return <SignInForm redirect={safeRedirect(redirect)} />
}
