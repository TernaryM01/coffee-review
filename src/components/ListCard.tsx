import { Link } from '@tanstack/react-router'
import type { Id } from '@convex/_generated/dataModel'
import type { BeanCard, Profile } from '@convex/lib/hydrate'
import { plural } from '~/lib/format'
import { BeanPoster } from './BeanPoster'
import { Avatar } from './ui'

type ListSummary = {
  _id: Id<'lists'>
  title: string
  description?: string
  beanCount: number
  owner: Profile | null
  preview: BeanCard[]
}

/** Overlapping poster stack, like Letterboxd list previews. */
export function PosterStack({ beans, size = 'md' }: { beans: BeanCard[]; size?: 'sm' | 'md' }) {
  const width = size === 'sm' ? 'w-12' : 'w-16 sm:w-20'
  const slots = Array.from({ length: 5 }, (_, i) => beans[i])
  return (
    <div className="flex">
      {slots.map((b, i) => (
        <div
          key={b?._id ?? `empty-${i}`}
          className={`${width} shrink-0 ${i > 0 ? '-ml-4 sm:-ml-6' : ''}`}
          style={{ zIndex: 5 - i }}
        >
          {b ? (
            <BeanPoster bean={b} className="shadow-[4px_0_12px_rgba(0,0,0,0.5)]" />
          ) : (
            <div className="aspect-[2/3] rounded-md bg-raised ring-1 ring-white/5" />
          )}
        </div>
      ))}
    </div>
  )
}

export function ListCard({ list, compact = false }: { list: ListSummary; compact?: boolean }) {
  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list._id }}
      className="group block"
    >
      <PosterStack beans={list.preview} size={compact ? 'sm' : 'md'} />
      <p className="mt-2 font-semibold leading-tight group-hover:text-crema">{list.title}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        {list.owner && (
          <>
            <Avatar user={list.owner} size={16} />
            <span className="font-semibold">{list.owner.name ?? list.owner.username}</span>
            <span>·</span>
          </>
        )}
        <span>{plural(list.beanCount, 'bean')}</span>
      </div>
      {!compact && list.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted">{list.description}</p>
      )}
    </Link>
  )
}
