'use client'

import { useMutation } from 'convex/react'
import { Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import { HANDLE_PATTERN, LIMITS } from '@convex/lib/constants'
import type { BeanCard } from '@convex/lib/hydrate'
import { BeanPicker } from '~/components/BeanPicker'
import { BeanPoster } from '~/components/BeanPoster'
import { Avatar, Dialog, ErrorText, SectionTitle } from '~/components/ui'
import { errorMessage } from '~/lib/format'
import { useImageUpload, useMe, type Me } from '~/lib/hooks'

export function SettingsView({ welcome }: { welcome: boolean }) {
  const me = useMe()
  // Signed-in only (src/proxy.ts); null only right after signing out here.
  if (!me) return null
  return (
    <div className="mx-auto max-w-2xl space-y-12 px-4 py-10">
      {welcome && (
        <div className="rounded-lg border border-leaf/40 bg-leaf/10 p-4 text-sm">
          <p className="font-semibold text-leaf">Welcome to Crema, @{me.username}!</p>
          <p className="mt-1 text-muted">
            We picked your username from your Google name; change it below if you like. Add your favorite
            beans, or jump straight in and{" "}
            <Link href="/beans" className="text-crema hover:underline">
              find something to log
            </Link>
            .
          </p>
        </div>
      )}
      <h1 className="font-display text-3xl">Settings</h1>
      {/* key: start the forms fresh if the account changes */}
      <ProfileSection key={me._id} me={me} />
      <UsernameSection key={`username-${me._id}`} me={me} />
      <FavoritesSection me={me} />
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

function UsernameSection({ me }: { me: Me }) {
  const setUsername = useMutation(api.users.setUsername)
  const router = useRouter()
  const [username, setValue] = useState(me.username)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const unchanged = username.trim() === me.username

  return (
    <section>
      <SectionTitle>Username</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        Your public handle and profile address. Changing it changes your profile link, and the old link stops
        working.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          const next = username.trim()
          if (!HANDLE_PATTERN.test(next)) {
            setError('Usernames are 2–24 letters, numbers, or underscores.')
            return
          }
          setStatus('saving')
          try {
            await setUsername({ username: next })
            setStatus('saved')
            router.refresh() // server-rendered links use the username
          } catch (err) {
            setError(errorMessage(err))
            setStatus('idle')
          }
        }}
      >
        <label className="block">
          <span className="label">Username</span>
          <div className="flex items-center gap-2">
            <span className="text-dim">@</span>
            <input
              value={username}
              maxLength={24}
              onChange={(e) => {
                setValue(e.target.value)
                setStatus('idle')
              }}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className="field"
            />
          </div>
          <span className="mt-1 block text-xs text-dim">Your profile: /u/{username.trim() || me.username}</span>
        </label>
        <ErrorText>{error}</ErrorText>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={status === 'saving' || unchanged}>
            {status === 'saving' ? 'Saving…' : 'Change username'}
          </button>
          {status === 'saved' && <span className="text-sm text-leaf">Saved.</span>}
        </div>
      </form>
    </section>
  )
}
