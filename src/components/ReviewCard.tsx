import { Link } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'
import type { HydratedLog } from '@convex/lib/hydrate'
import { formatDate } from '~/lib/format'
import { BeanPoster } from './BeanPoster'
import { Stars } from './Rating'
import { Avatar, UserLink } from './ui'

/** A review (or plain diary entry) as shown in feeds and on bean pages. */
export function ReviewCard({
  log,
  showBean = true,
  clamp = true,
}: {
  log: HydratedLog
  showBean?: boolean
  clamp?: boolean
}) {
  return (
    <article className="flex gap-4 border-b border-line py-5 last:border-b-0">
      {showBean && (
        <Link
          to="/beans/$beanId"
          params={{ beanId: log.bean._id }}
          className="w-16 shrink-0 sm:w-20"
          aria-label={log.bean.name}
        >
          <BeanPoster bean={log.bean} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {showBean && (
          <h3 className="mb-1 leading-tight">
            <Link
              to="/beans/$beanId"
              params={{ beanId: log.bean._id }}
              className="font-display text-lg font-semibold hover:text-crema"
            >
              {log.bean.name}
            </Link>{' '}
            <span className="text-sm text-muted">{log.bean.roasterName}</span>
          </h3>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <Avatar user={log.user} size={20} />
          <UserLink user={log.user} className="text-sm" />
          {log.rating !== undefined && <Stars rating={log.rating} className="text-sm" />}
          {log.liked && <span className="text-cherry" aria-label="Liked">♥</span>}
          {log.rebrew && <RotateCcw className="size-3.5 text-dim" aria-label="Rebrew" />}
          <Link
            to="/reviews/$logId"
            params={{ logId: log._id }}
            className="text-xs text-dim hover:text-ink"
          >
            {log.method ? `${log.method} · ` : ''}
            {formatDate(log.brewedOn)}
          </Link>
        </div>
        {log.review && (
          <p className={`prose-review mt-2 text-[15px] ${clamp ? 'line-clamp-4' : ''}`}>
            {log.review}
          </p>
        )}
        {clamp && log.review && log.review.length > 320 && (
          <Link
            to="/reviews/$logId"
            params={{ logId: log._id }}
            className="mt-1 inline-block text-xs font-semibold text-crema hover:underline"
          >
            Read more
          </Link>
        )}
        {log.notes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {log.notes.map((n) => (
              <span key={n} className="chip">
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
