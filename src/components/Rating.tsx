'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { stars } from '~/lib/format'

export function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span className={`text-crema ${className}`} aria-label={`${rating} out of 5 stars`}>
      {stars(rating)}
    </span>
  )
}

/** Half-star rating input. Clicking the current rating clears it. */
export function RatingInput({
  value,
  onChange,
  size = 28,
  disabled = false,
}: {
  value: number | null
  onChange: (rating: number | null) => void
  size?: number
  disabled?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0

  return (
    <div
      className="inline-flex items-center"
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = shown >= i ? 1 : shown >= i - 0.5 ? 0.5 : 0
        return (
          <span key={i} className="relative" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-line" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: fill === 1 ? size : size / 2 }}
              >
                <Star
                  className={hover !== null ? 'text-crema-strong' : 'text-crema'}
                  style={{ width: size, height: size }}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
            {[i - 0.5, i].map((r, half) => (
              <button
                key={r}
                type="button"
                disabled={disabled}
                role="radio"
                aria-checked={value === r}
                aria-label={`${r} star${r === 1 ? '' : 's'}`}
                className={`absolute inset-y-0 w-1/2 cursor-pointer disabled:cursor-default ${half ? 'right-0' : 'left-0'}`}
                onMouseEnter={() => setHover(r)}
                onFocus={() => setHover(r)}
                onBlur={() => setHover(null)}
                onClick={() => onChange(value === r ? null : r)}
              />
            ))}
          </span>
        )
      })}
    </div>
  )
}

export function RatingHistogram({
  histogram,
  avg,
  count,
}: {
  histogram: number[]
  avg: number
  count: number
}) {
  if (count === 0) {
    return <p className="text-sm text-dim">No ratings yet. Be the first.</p>
  }
  const max = Math.max(1, ...histogram)
  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="pb-0.5 text-xs text-leaf">★</span>
        <div className="flex h-16 flex-1 items-end gap-[3px]">
          {histogram.map((n, i) => {
            const rating = (i + 1) / 2
            const pct = count ? Math.round((n / count) * 100) : 0
            return (
              <div
                key={i}
                className="group relative flex h-full flex-1 items-end"
                title={`${n} ${stars(rating)} rating${n === 1 ? '' : 's'} (${pct}%)`}
              >
                <div
                  className="w-full rounded-t-sm bg-dim/60 transition group-hover:bg-crema"
                  style={{ height: `${Math.max(3, (n / max) * 100)}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="text-right">
          <p className="font-display text-3xl leading-none">{count ? avg.toFixed(1) : '–'}</p>
          <p className="mt-1 text-xs text-crema">★★★★★</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-dim">
        {count ? `${count.toLocaleString()} rating${count === 1 ? '' : 's'}` : 'No ratings yet'}
      </p>
    </div>
  )
}
