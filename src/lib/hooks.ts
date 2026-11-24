'use client'

import { useConvexAuth, useMutation, usePreloadedQuery, type Preloaded } from 'convex/react'
import type { FunctionReference, FunctionReturnType } from 'convex/server'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

/**
 * `usePreloadedQuery` that keeps the server's value while the client's auth
 * handshake is in progress, so viewer-specific data rendered signed-in on the
 * server doesn't flash its signed-out version during hydration.
 */
export function usePreloaded<Q extends FunctionReference<'query'>>(preloaded: Preloaded<Q>) {
  const live = usePreloadedQuery(preloaded)
  const { isLoading } = useConvexAuth()
  // Remember the last value seen while auth was settled ("storing information
  // from previous renders": a setState during render that React allows).
  const [settled, setSettled] = useState(live)
  if (!isLoading && settled !== live) setSettled(live)
  return isLoading ? settled : live
}

export type Me = NonNullable<FunctionReturnType<typeof api.users.me>>

export const MeContext = createContext<Me | null>(null)

/** The signed-in user, or null. Known on the server, so never "loading". */
export function useMe(): Me | null {
  return useContext(MeContext)
}

/**
 * Wraps an action so signed-out visitors get sent to the sign-in page (and
 * back here afterwards) instead.
 */
export function useRequireAuth() {
  const me = useMe()
  const router = useRouter()
  return useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (!me) {
          const here = window.location.pathname + window.location.search
          router.push(`/signin?redirect=${encodeURIComponent(here)}`)
          return
        }
        fn(...args)
      },
    [me, router],
  )
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

const MAX_BYTES = 5 * 1024 * 1024

/** Upload an image to Convex storage and return its id. */
export function useImageUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  return useCallback(
    async (file: File): Promise<Id<'_storage'>> => {
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
      if (file.size > MAX_BYTES) throw new Error('Images must be under 5 MB.')
      const url = await generateUploadUrl()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error('Upload failed. Please try again.')
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      return storageId
    },
    [generateUploadUrl],
  )
}
