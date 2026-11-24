import { Link, createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery } from 'convex/react'
import { AlignLeft, RotateCcw } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { BeanPoster } from '~/components/BeanPoster'
import { Stars } from '~/components/Rating'
import { EmptyState, LineSkeletons } from '~/components/States'
import { dayOfMonth, monthLabel } from '~/lib/format'

export const Route = createFileRoute('/u/$username/diary')({
  component: Diary,
})

function Diary() {
  const { username } = Route.useParams()
  const { results, status, loadMore } = usePaginatedQuery(
    api.logs.diary,
    { username },
    { initialNumItems: 40 },
  )
  if (status === 'LoadingFirstPage') return <LineSkeletons count={5} />
  if (results.length === 0) return <EmptyState title="The diary is empty" />

  let lastMonth = ''
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-dim">
              <th className="w-20 py-2 font-semibold">Month</th>
              <th className="w-12 py-2 font-semibold">Day</th>
              <th className="py-2 font-semibold">Bean</th>
              <th className="w-28 py-2 font-semibold">Method</th>
              <th className="w-24 py-2 font-semibold">Rating</th>
              <th className="w-20 py-2 text-center font-semibold">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((log) => {
              const { month, year } = monthLabel(log.brewedOn)
              const key = `${month}${year}`
              const showMonth = key !== lastMonth
              lastMonth = key
              return (
                <tr key={log._id} className={`${showMonth ? 'border-t border-line' : ''} align-middle`}>
                  <td className="py-2">
                    {showMonth && (
                      <div className="w-14 rounded border border-line bg-raised py-1 text-center leading-tight">
                        <p className="text-xs font-bold">{month}</p>
                        <p className="text-[10px] text-dim">{year}</p>
                      </div>
                    )}
                  </td>
                  <td className="py-2 font-display text-xl text-muted">{dayOfMonth(log.brewedOn)}</td>
                  <td className="py-2">
                    <Link to="/beans/$beanId" params={{ beanId: log.bean._id }} className="group flex items-center gap-3">
                      <BeanPoster bean={log.bean} className="w-8 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold group-hover:text-crema">{log.bean.name}</span>
                        <span className="block truncate text-xs text-dim">{log.bean.roasterName}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 text-xs text-muted">{log.method ?? '—'}</td>
                  <td className="py-2">
                    {log.rating !== undefined && <Stars rating={log.rating} />}
                    {log.liked && <span className="ml-1 text-cherry">♥</span>}
                  </td>
                  <td className="py-2">
                    <Link
                      to="/reviews/$logId"
                      params={{ logId: log._id }}
                      className="flex items-center justify-center gap-2 text-dim hover:text-ink"
                      aria-label="Open entry"
                    >
                      {log.rebrew && <RotateCcw className="size-4" aria-label="Rebrew" />}
                      {log.hasReview ? <AlignLeft className="size-4" aria-label="Has review" /> : <span className="text-xs">view</span>}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {status !== 'Exhausted' && (
        <div className="mt-6 text-center">
          <button className="btn-ghost" disabled={status === 'LoadingMore'} onClick={() => loadMore(40)}>
            Older entries
          </button>
        </div>
      )}
    </div>
  )
}
