import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useAddPasskey, useRemovePasskey } from '@convex-dev/auth/methods/username-passkey/react'
import { KeyRound, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import { LIMITS } from '@convex/lib/constants'
import type { BeanCard } from '@convex/lib/hydrate'
import { BeanPicker } from '~/components/BeanPicker'
import { BeanPoster } from '~/components/BeanPoster'
import { Avatar, Dialog, ErrorText, SectionTitle } from '~/components/ui'
import { errorMessage } from '~/lib/format'
import { useImageUpload, useMe } from '~/lib/hooks'

export const Route = createFileRoute('/settings')({
  validateSearch: (s: Record<string, unknown>): { welcome?: boolean } => ({
    welcome: s.welcome === true || s.welcome === 'true' ? true : undefined,
  }),
  head: () => ({ meta: [{ title: 'Settings · Crema' }] }),
  component: Settings,
})

type Me = NonNullable<ReturnType<typeof useMe>>

function Settings() {
  const me = useMe()
  const { welcome } = Route.useSearch()
  if (me === undefined) return null
  if (me === null) {
    return (
      <p className="mx-auto max-w-2xl px-4 py-16 text-muted">
        <Link to="/signin" search={{ redirect: '/settings' }} className="text-crema hover:underline">
          Sign in
        </Link>{' '}
        to edit your profile.
      </p>
    )
  }
  return (
    <div className="mx-auto max-w-2xl space-y-12 px-4 py-10">
      {welcome && (
        <div className="rounded-lg border border-leaf/40 bg-leaf/10 p-4 text-sm">
          <p className="font-semibold text-leaf">Welcome to Crema, @{me.username}!</p>
          <p className="mt-1 text-muted">
            Add a display name and your favorite beans, or jump straight in and{' '}
            <Link to="/beans" className="text-crema hover:underline">
              find something to log
            </Link>
            .
          </p>
        </div>
      )}
      <h1 className="font-display text-3xl">Settings</h1>
      <ProfileSection me={me} />
      <FavoritesSection me={me} />
      <PasskeySection />
    </div>
  )
}

function ProfileSection({ me }: { me: Me }) {
  const updateProfile = useMutation(api.users.updateProfile)
  const setAvatar = useMutation(api.users.setAvatar)
  const upload = useImageUpload()
  const [name, setName] = useState(me.name ?? '')
  const [bio, setBio] = useState(me.bio ?? '')
  const [location, setLocation] = useState(me.location ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  return (
    <section>
      <SectionTitle>Profile</SectionTitle>
      <div className="mb-5 flex items-center gap-4">
        <Avatar user={me} size={64} />
        <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
          Upload photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setError(null)
              try {
                await setAvatar({ storageId: await upload(file) })
              } catch (err) {
                setError(errorMessage(err))
              }
            }}
          />
        </label>
        {me.avatarUrl && (
          <button className="text-xs text-dim hover:text-ink" onClick={() => void setAvatar({ storageId: null })}>
            Remove
          </button>
        )}
      </div>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          setStatus('saving')
          try {
            await updateProfile({ name, bio, location })
            setStatus('saved')
          } catch (err) {
            setError(errorMessage(err))
            setStatus('idle')
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Display name</span>
            <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={me.username} className="field" />
          </label>
          <label className="block">
            <span className="label">Location</span>
            <input value={location} maxLength={60} onChange={(e) => setLocation(e.target.value)} placeholder="City, country" className="field" />
          </label>
        </div>
        <label className="block">
          <span className="label">Bio</span>
          <textarea
            rows={3}
            value={bio}
            maxLength={LIMITS.bioMax}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Your brewer, your go-to roast, your coffee hot takes…"
            className="field"
          />
        </label>
        <ErrorText>{error}</ErrorText>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save profile'}
          </button>
          {status === 'saved' && <span className="text-sm text-leaf">Saved.</span>}
        </div>
      </form>
    </section>
  )
}

function FavoritesSection({ me }: { me: Me }) {
  const setFavorites = useMutation(api.users.setFavorites)
  const [picking, setPicking] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const favorites: (BeanCard | undefined)[] = Array.from({ length: LIMITS.favoritesMax }, (_, i) => me.favorites[i])

  const save = (next: (BeanCard | undefined)[]) => {
    setError(null)
    setFavorites({ beanIds: next.filter((b) => b !== undefined).map((b) => b._id) }).catch((e) =>
      setError(errorMessage(e)),
    )
  }

  return (
    <section>
      <SectionTitle>Favorite beans</SectionTitle>
      <p className="mb-4 text-sm text-muted">Your four all-time favorites, shown at the top of your profile.</p>
      <div className="grid grid-cols-4 gap-3">
        {favorites.map((bean, i) =>
          bean ? (
            <div key={bean._id} className="relative">
              <BeanPoster bean={bean} />
              <button
                aria-label={`Remove ${bean.name}`}
                className="absolute -right-2 -top-2 rounded-full bg-bg p-1 text-muted ring-1 ring-line hover:text-cherry"
                onClick={() => save(favorites.map((b, j) => (j === i ? undefined : b)))}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              key={`empty-${i}`}
              onClick={() => setPicking(i)}
              className="flex aspect-[2/3] items-center justify-center rounded-md border border-dashed border-line text-dim hover:border-crema hover:text-crema"
              aria-label="Add a favorite"
            >
              <Plus className="size-6" />
            </button>
          ),
        )}
      </div>
      <ErrorText>{error}</ErrorText>
      <Dialog open={picking !== null} onClose={() => setPicking(null)} title="Pick a favorite">
        <BeanPicker
          exclude={me.favorites.map((b) => b._id)}
          onPick={(bean) => {
            const next = [...favorites]
            next[picking ?? 0] = bean
            save(next)
            setPicking(null)
          }}
        />
      </Dialog>
    </section>
  )
}

const PASSKEY_ERRORS: Record<string, string> = {
  LAST_PASSKEY: "You can't remove your only passkey — add another one first.",
  TOO_MANY_PASSKEYS: 'You have the maximum number of passkeys.',
  PASSKEY_ALREADY_REGISTERED: 'This device already has a passkey for your account.',
  CEREMONY_ABORTED: '',
  NOT_LOGGED_IN: 'Please sign in again.',
}

function PasskeySection() {
  const result = useQuery(api.auth.listPasskeys, {})
  const { addPasskey, pending: adding } = useAddPasskey(api.auth)
  const { removePasskey, pending: removing } = useRemovePasskey(api.auth)
  const [error, setError] = useState<string | null>(null)
  const passkeys = result?.success ? result.passkeys : []

  const report = (r: { success: boolean; userError?: { error: string } }) => {
    if (!r.success) {
      const code = r.userError?.error ?? 'OTHER_ERROR'
      setError(PASSKEY_ERRORS[code] ?? 'Something went wrong with the passkey. Please try again.')
    }
  }

  return (
    <section>
      <SectionTitle>Passkeys</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        Passkeys are how you sign in. Add one on each device that doesn't sync with the others
        (for example, an Android phone and a Windows laptop).
      </p>
      <ul className="mb-4 divide-y divide-line rounded-lg border border-line">
        {passkeys.map((p) => (
          <li key={p.passkeyId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <KeyRound className="size-4 text-dim" />
            <span className="flex-1">
              {p.name ?? 'Passkey'}
              <span className="ml-2 text-xs text-dim">added {new Date(p.createdAt).toLocaleDateString()}</span>
            </span>
            <button
              disabled={removing || passkeys.length < 2}
              title={passkeys.length < 2 ? 'Add another passkey before removing this one' : undefined}
              className="text-xs text-dim hover:text-cherry disabled:opacity-40 disabled:hover:text-dim"
              onClick={async () => {
                setError(null)
                report(await removePasskey(p.passkeyId))
              }}
            >
              Remove
            </button>
          </li>
        ))}
        {result !== undefined && passkeys.length === 0 && <li className="px-3 py-2.5 text-sm text-dim">No passkeys found.</li>}
      </ul>
      <ErrorText>{error || null}</ErrorText>
      <button
        className="btn-ghost mt-2"
        disabled={adding}
        onClick={async () => {
          setError(null)
          report(await addPasskey())
        }}
      >
        <Plus className="size-4" /> {adding ? 'Waiting for your device…' : 'Add a passkey'}
      </button>
    </section>
  )
}
