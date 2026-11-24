'use client'

import type { Preloaded } from 'convex/react'
import { RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { api } from '@convex/_generated/api'
import { BeanPoster } from '~/components/BeanPoster'
import { useLog } from '~/components/LogDialog'
import { Stars } from '~/components/Rating'
import { NotFound } from '~/components/States'
import { Avatar, UserLink } from '~/components/ui'
import { formatDate } from '~/lib/format'
import { useMe, usePreloaded } from '~/lib/hooks'

export function ReviewView({ preloaded }: { preloaded: Preloaded<typeof api.logs.get> }) {
  const log = usePreloaded(preloaded)
  const me = useMe()
  const { openLog } = useLog()
  if (!log) return <NotFound what="review" />
  const r = log.recipe
  const recipe = r
    ? [
        r.doseG !== undefined && `${r.doseG} g in`,
        r.yieldG !== undefined && `${r.yieldG} g out`,
        r.tempC !== undefined && `${r.tempC} °C`,
        r.grind && `${r.grind} grind`,
        r.time && r.time,
      ].filter(Boolean)
    : []

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:grid-cols-[180px_1fr]">
      <Link href={`/beans/${log.bean._id}`} className="mx-auto w-40 sm:w-full">
        <BeanPoster bean={log.bean} className="shadow-xl" />
      </Link>
      <article className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Avatar user={log.user} size={28} />
          <span>
            {log.hasReview ? 'Review' : 'Brewed'} by <UserLink user={log.user} />
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
          <Link href={`/beans/${log.bean._id}`} className="hover:text-crema">
            {log.bean.name}
          </Link>
        </h1>
        <p className="text-muted">{log.bean.roasterName}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {log.rating !== undefined && <Stars rating={log.rating} className="text-xl" />}
          {log.liked && <span className="text-lg text-cherry">♥</span>}
          <span className="text-dim">
            {log.rebrew && <RotateCcw className="mr-1 inline size-3.5" aria-label="Rebrew" />}
            Brewed {formatDate(log.brewedOn)}
            {log.method && ` · ${log.method}`}
          </span>
        </div>

        {log.review && <p className="prose-review mt-6 text-lg">{log.review}</p>}

        {log.notes.length > 0 && (
          <div className="mt-6">
            <p className="label">Tasted</p>
            <div className="flex flex-wrap gap-2">
              {log.notes.map((n) => (
                <span key={n} className="chip text-sm text-ink">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.length > 0 && (
          <div className="mt-6">
            <p className="label">Recipe</p>
            <p className="text-sm text-ink">{recipe.join(' · ')}</p>
          </div>
        )}

        {me && me._id === log.userId && (
          <button className="btn-ghost mt-8" onClick={() => openLog({ bean: log.bean, log })}>
            Edit entry
          </button>
        )}
      </article>
    </div>
  )
}
