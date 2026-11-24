import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

/** The signed-in user. `undefined` while loading, `null` when signed out. */
export function useMe() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const result = isLoading ? undefined : !isAuthenticated ? null : me
  // Auth briefly reports "loading" again when it refreshes or adopts a new
  // session. Keep showing the last known user through that blip so pages
  // (and half-filled forms) don't unmount and remount.
  const last = useRef<typeof result>(undefined)
  if (result !== undefined) last.current = result
  return result === undefined ? last.current : result
}

/**
 * Wraps an action so signed-out visitors get sent to the sign-in page
 * (and back here afterwards) instead.
 */
export function useRequireAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        // Still restoring the session: don't bounce a signed-in user to /signin.
        if (isLoading) return
        if (!isAuthenticated) {
          void navigate({ to: '/signin', search: { redirect: location.href } })
          return
        }
        fn(...args)
      },
    [isLoading, isAuthenticated, navigate, location.href],
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
