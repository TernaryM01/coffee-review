'use client'

import type { Preloaded } from 'convex/react'
import { api } from '@convex/_generated/api'
import { LogProvider } from '~/components/LogDialog'
import { MeContext, usePreloaded } from '~/lib/hooks'

/** Client-side app context: the signed-in user (live) and the "Log a brew" dialog. */
export function Providers({
  preloadedMe,
  children,
}: {
  preloadedMe: Preloaded<typeof api.users.me>
  children: React.ReactNode
}) {
  const me = usePreloaded(preloadedMe)
  return (
    <MeContext.Provider value={me}>
      <LogProvider>{children}</LogProvider>
    </MeContext.Provider>
  )
}
