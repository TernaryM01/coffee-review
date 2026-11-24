import Link from 'next/link'
import { ROAST_LEVELS } from '@convex/lib/constants'
import type { BeanCard } from '@convex/lib/hydrate'
import { hash, stars } from '~/lib/format'

/** Bag colorways for beans without a photo: [bag, ink, accent]. */
const PALETTES: [string, string, string][] = [
  ['#b8946a', '#2b1d12', '#7a3b1d'], // kraft
  ['#2f4a3a', '#efe3cc', '#e3a857'], // forest
  ['#b5553c', '#fbeee0', '#2b1d12'], // terracotta
  ['#23344d', '#f3e6cf', '#e3a857'], // navy
  ['#c99a2e', '#2a1c0c', '#fbeee0'], // mustard
  ['#5a2f45', '#f6e3e8', '#e3a857'], // plum
  ['#2b6a6a', '#eef4ef', '#f2c48d'], // teal
  ['#e9dcc4', '#3a2618', '#b5553c'], // cream
  ['#1f1c1a', '#e3a857', '#8bb870'], // black
  ['#8ea58a', '#1e2a1c', '#5a2f45'], // sage
]

type PosterBean = Pick<
  BeanCard,
  'name' | 'roasterName' | 'origin' | 'process' | 'roastLevel' | 'imageUrl'
>

export function BeanPoster({
  bean,
  className = '',
}: {
  bean: PosterBean
  className?: string
}) {
  if (bean.imageUrl) {
    return (
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-md bg-raised ring-1 ring-white/10 ${className}`}
      >
        <img
          src={bean.imageUrl}
          alt={`${bean.name} by ${bean.roasterName}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  const [bag, ink, accent] = PALETTES[hash(bean.roasterName + bean.name) % PALETTES.length]
  const roast = Math.max(0, (ROAST_LEVELS as readonly string[]).indexOf(bean.roastLevel)) + 1
  const long = bean.name.length > 22

  return (
    <div
      role="img"
      aria-label={`${bean.name} by ${bean.roasterName}`}
      className={`@container relative aspect-[2/3] overflow-hidden rounded-md ring-1 ring-white/10 ${className}`}
      style={{ backgroundColor: bag, color: ink }}
    >
      {/* crimped top seal */}
      <div
        className="absolute inset-x-0 top-0 h-[5%] opacity-25"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${ink} 0 2px, transparent 2px 6px)`,
        }}
      />
      {/* one-way degassing valve */}
      <div
        className="absolute right-[9%] top-[10%] aspect-square w-[11%] rounded-full border-2 opacity-60"
        style={{ borderColor: ink }}
      />
      <div className="absolute inset-0 flex flex-col px-[9%] pb-[9%] pt-[11%]">
        <p className="line-clamp-2 pr-[16%] text-[6.5cqw] font-bold uppercase leading-tight tracking-[0.08em] opacity-80">
          {bean.roasterName}
        </p>
        <div className="flex flex-1 items-center">
          <p
            className={`font-display font-semibold leading-[1.05] ${long ? 'text-[11cqw]' : 'text-[14cqw]'}`}
            style={{ overflowWrap: 'anywhere' }}
          >
            {bean.name}
          </p>
        </div>
        <div className="space-y-[3cqw]">
          <div className="h-px w-full opacity-40" style={{ backgroundColor: ink }} />
          <p className="truncate text-[7.5cqw] font-semibold">{bean.origin}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[6cqw] opacity-75">{bean.process}</p>
            <div className="flex shrink-0 gap-[1.5cqw]" title={`${bean.roastLevel} roast`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="aspect-square w-[4cqw] rounded-full"
                  style={{
                    backgroundColor: i <= roast ? accent : 'transparent',
                    border: `1px solid ${ink}`,
                    opacity: i <= roast ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Poster that links to the bean page, with an optional rating underneath. */
export function BeanTile({
  bean,
  rating,
  liked,
  showMeta = false,
}: {
  bean: BeanCard
  rating?: number | null
  liked?: boolean
  showMeta?: boolean
}) {
  return (
    <div className="group min-w-0">
      <Link
        href={`/beans/${bean._id}`}
        className="block rounded-md transition group-hover:ring-2 group-hover:ring-crema"
        title={`${bean.name} — ${bean.roasterName}`}
      >
        <BeanPoster bean={bean} />
      </Link>
      {(rating !== undefined || liked) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-crema">
          {rating ? stars(rating) : null}
          {liked && <span className="text-cherry">♥</span>}
        </p>
      )}
      {showMeta && (
        <div className="mt-1.5 min-w-0">
          <p className="truncate text-sm font-medium">{bean.name}</p>
          <p className="truncate text-xs text-muted">{bean.roasterName}</p>
        </div>
      )}
    </div>
  )
}

export function BeanGrid({
  children,
  dense = false,
}: {
  children: React.ReactNode
  dense?: boolean
}) {
  return (
    <div
      className={
        dense
          ? 'grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8'
          : 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
      }
    >
      {children}
    </div>
  )
}
