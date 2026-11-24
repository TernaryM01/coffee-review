'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { hash } from '~/lib/format'

export function SectionTitle({
  children,
  more,
}: {
  children: React.ReactNode
  more?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 border-b border-line pb-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">{children}</h2>
      {more && <div className="text-xs uppercase tracking-wider text-dim">{more}</div>}
    </div>
  )
}

const AVATAR_COLORS = ['#b5553c', '#2f4a3a', '#23344d', '#c99a2e', '#5a2f45', '#2b6a6a']

export function Avatar({
  user,
  size = 32,
}: {
  user: { username: string; name: string | null; avatarUrl: string | null }
  size?: number
}) {
  const label = user.name ?? user.username
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: AVATAR_COLORS[hash(user.username) % AVATAR_COLORS.length],
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function UserLink({
  user,
  className = '',
}: {
  user: { username: string; name: string | null }
  className?: string
}) {
  return (
    <Link
      href={`/u/${user.username}`}
      className={`font-semibold text-ink hover:text-crema ${className}`}
    >
      {user.name ?? user.username}
    </Link>
  )
}

/** A modal built on the native <dialog> element. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-xl">{title}</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl leading-none">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-dim">{label}</p>
    </div>
  )
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-md border border-cherry/30 bg-cherry/10 px-3 py-2 text-sm text-cherry">
      {children}
    </p>
  )
}
