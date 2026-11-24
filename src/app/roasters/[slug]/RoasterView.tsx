'use client'

import type { Preloaded } from 'convex/react'
import { ExternalLink, MapPin } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { BeanGrid, BeanTile } from '~/components/BeanPoster'
import { NotFound } from '~/components/States'
import { SectionTitle } from '~/components/ui'
import { plural } from '~/lib/format'
import { usePreloaded } from '~/lib/hooks'

export function RoasterView({ preloaded }: { preloaded: Preloaded<typeof api.roasters.bySlug> }) {
  const data = usePreloaded(preloaded)
  if (!data) return <NotFound what="roaster" />
  const { roaster, beans } = data
  const brewers = beans.reduce((n, b) => n + b.brewerCount, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-dim">Roaster</p>
      <h1 className="font-display text-4xl font-semibold">{roaster.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
        {roaster.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-4" /> {roaster.location}
          </span>
        )}
        {roaster.website && (
          <a href={roaster.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 hover:text-crema">
            <ExternalLink className="size-4" /> {roaster.website.replace(/^https?:\/\//, '')}
          </a>
        )}
        <span>
          {plural(beans.length, 'bean')} · {plural(brewers, 'brewer')}
        </span>
      </div>
      <div className="mt-10">
        <SectionTitle>Beans</SectionTitle>
        <BeanGrid>
          {beans.map((b) => (
            <BeanTile key={b._id} bean={b} showMeta />
          ))}
        </BeanGrid>
      </div>
    </div>
  )
}
