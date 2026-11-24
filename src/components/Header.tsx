import { Link, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { ChevronDown, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMe, useRequireAuth } from '~/lib/hooks'
import { useLog } from './LogDialog'
import { Avatar } from './ui'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Crema home">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <ellipse cx="16" cy="16" rx="11" ry="14" transform="rotate(30 16 16)" fill="#e3a857" />
        <path
          d="M10.5 6.5c5 4 1.5 9.5 5.5 12.5s3.5 6.5 5.5 7"
          transform="rotate(0 16 16)"
          stroke="#15110e"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="font-display text-2xl font-semibold tracking-tight">crema</span>
    </Link>
  )
}

const NAV = [
  { to: '/beans', label: 'Beans' },
  { to: '/roasters', label: 'Roasters' },
  { to: '/lists', label: 'Lists' },
  { to: '/members', label: 'Members' },
] as const

export function Header() {
  const me = useMe()
  const { openLog } = useLog()
  const requireAuth = useRequireAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const navLink =
    'text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-ink [&.active]:text-ink'

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden items-center gap-5 md:flex">
          {me && (
            <Link to="/activity" className={navLink}>
              Activity
            </Link>
          )}
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={navLink}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <form
            className="relative hidden sm:block"
            onSubmit={(e) => {
              e.preventDefault()
              void navigate({ to: '/beans', search: { q: q.trim() || undefined } })
            }}
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label="Search beans"
              className="h-8 w-40 rounded-full border border-line bg-raised pl-8 pr-3 text-sm placeholder:text-dim focus:w-56 focus:border-crema focus:outline-none lg:w-48"
            />
          </form>
          <button
            onClick={requireAuth(() => openLog())}
            className="btn-primary h-8 px-3 text-xs uppercase tracking-wider"
          >
            <Plus className="size-4" strokeWidth={3} /> Log
          </button>
          {me === undefined ? (
            <span className="size-8 animate-pulse rounded-full bg-raised" />
          ) : me === null ? (
            <Link to="/signin" className="text-sm font-semibold text-muted hover:text-ink">
              Sign in
            </Link>
          ) : (
            <AccountMenu me={me} />
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-2.5 md:hidden">
        {me && (
          <Link to="/activity" className={navLink}>
            Activity
          </Link>
        )}
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={navLink}>
            {n.label}
          </Link>
        ))}
        <Link to="/beans" search={{ focus: true }} className={`${navLink} sm:hidden`}>
          Search
        </Link>
      </nav>
    </header>
  )
}

function AccountMenu({ me }: { me: { username: string; name: string | null; avatarUrl: string | null } }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { signOut } = useAuthActions()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'block px-4 py-2 text-sm text-muted hover:bg-raised hover:text-ink'
  const close = () => setOpen(false)
  const params = { username: me.username }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar user={me} size={30} />
        <ChevronDown className="size-3.5 text-dim" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl"
        >
          <p className="truncate border-b border-line px-4 pb-2 pt-1 text-xs text-dim">
            @{me.username}
          </p>
          <Link to="/u/$username" params={params} className={item} onClick={close}>
            Profile
          </Link>
          <Link to="/u/$username/diary" params={params} className={item} onClick={close}>
            Diary
          </Link>
          <Link to="/u/$username/reviews" params={params} className={item} onClick={close}>
            Reviews
          </Link>
          <Link to="/u/$username/wishlist" params={params} className={item} onClick={close}>
            Wishlist
          </Link>
          <Link to="/u/$username/lists" params={params} className={item} onClick={close}>
            Lists
          </Link>
          <Link to="/settings" className={`${item} border-t border-line`} onClick={close}>
            Settings
          </Link>
          <button
            className={`${item} w-full text-left`}
            onClick={() => {
              close()
              void signOut().then(() => navigate({ to: '/' }))
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
