import { useMutation, useQuery } from 'convex/react'
import { Heart, RotateCcw } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { BREW_METHODS, FLAVOR_SUGGESTIONS, LIMITS } from '@convex/lib/constants'
import type { BeanCard } from '@convex/lib/hydrate'
import { errorMessage, todayISO } from '~/lib/format'
import { BeanPicker } from './BeanPicker'
import { BeanPoster } from './BeanPoster'
import { ChipInput } from './ChipInput'
import { RatingInput } from './Rating'
import { Dialog, ErrorText } from './ui'

type OpenArgs = { bean?: BeanCard; log?: Doc<'logs'> }
type LogContextValue = { openLog: (args?: OpenArgs) => void }

const LogContext = createContext<LogContextValue>({ openLog: () => {} })

export function useLog() {
  return useContext(LogContext)
}

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; args: OpenArgs; key: number }>({
    open: false,
    args: {},
    key: 0,
  })
  const openLog = useCallback(
    (args: OpenArgs = {}) => setState((s) => ({ open: true, args, key: s.key + 1 })),
    [],
  )
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  return (
    <LogContext.Provider value={{ openLog }}>
      {children}
      <Dialog
        open={state.open}
        onClose={close}
        title={state.args.log ? 'Edit diary entry' : 'Log a brew'}
        wide
      >
        <LogForm key={state.key} initial={state.args} onDone={close} />
      </Dialog>
    </LogContext.Provider>
  )
}

function num(s: string): number | undefined {
  const n = Number(s)
  return s.trim() === '' || !Number.isFinite(n) ? undefined : n
}

function LogForm({ initial, onDone }: { initial: OpenArgs; onDone: () => void }) {
  const editing = initial.log
  const [bean, setBean] = useState<BeanCard | undefined>(initial.bean)
  const mine = useQuery(api.userBeans.mine, bean && !editing ? { beanId: bean._id } : 'skip')

  const [brewedOn, setBrewedOn] = useState(editing?.brewedOn ?? todayISO())
  const [rebrew, setRebrew] = useState(editing?.rebrew ?? false)
  const [method, setMethod] = useState(editing?.method ?? '')
  const [rating, setRating] = useState<number | null>(editing?.rating ?? null)
  const [liked, setLiked] = useState(editing?.liked ?? false)
  const [notes, setNotes] = useState<string[]>(editing?.notes ?? [])
  const [review, setReview] = useState(editing?.review ?? '')
  const [dose, setDose] = useState(editing?.recipe?.doseG?.toString() ?? '')
  const [yieldG, setYieldG] = useState(editing?.recipe?.yieldG?.toString() ?? '')
  const [temp, setTemp] = useState(editing?.recipe?.tempC?.toString() ?? '')
  const [grind, setGrind] = useState(editing?.recipe?.grind ?? '')
  const [time, setTime] = useState(editing?.recipe?.time ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Prefill from the viewer's existing state for this bean, once it loads.
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    if (prefilled || editing || !mine) return
    setPrefilled(true)
    if (mine.rating !== null) setRating(mine.rating)
    if (mine.liked) setLiked(true)
    if (mine.brewCount > 0) setRebrew(true)
  }, [mine, prefilled, editing])

  const create = useMutation(api.logs.create)
  const update = useMutation(api.logs.update)

  if (!bean && !editing) {
    return <BeanPicker onPick={setBean} />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const fields = {
      brewedOn,
      rebrew,
      method: method || undefined,
      rating: rating ?? undefined,
      liked,
      notes,
      review: review.trim() || undefined,
      recipe: {
        doseG: num(dose),
        yieldG: num(yieldG),
        tempC: num(temp),
        grind: grind.trim() || undefined,
        time: time.trim() || undefined,
      },
    }
    try {
      if (editing) await update({ logId: editing._id, ...fields })
      else await create({ beanId: bean!._id, ...fields })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {bean && (
        <div className="flex items-center gap-3">
          <BeanPoster bean={bean} className="w-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{bean.name}</p>
            <p className="truncate text-sm text-muted">
              {bean.roasterName} · {bean.origin}
            </p>
          </div>
          {!editing && !initial.bean && (
            <button type="button" className="text-xs text-dim hover:text-ink" onClick={() => setBean(undefined)}>
              Change
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="brewedOn">
            Brewed on
          </label>
          <input
            id="brewedOn"
            type="date"
            required
            max={todayISO()}
            value={brewedOn}
            onChange={(e) => setBrewedOn(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="method">
            Brew method
          </label>
          <select id="method" value={method} onChange={(e) => setMethod(e.target.value)} className="field">
            <option value="">—</option>
            {BREW_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label">Rating</span>
          <RatingInput value={rating} onChange={setRating} />
        </div>
        <div className="flex items-center gap-4 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={rebrew} onChange={(e) => setRebrew(e.target.checked)} className="accent-crema" />
            <RotateCcw className="size-4" /> Brewed before
          </label>
          <button
            type="button"
            onClick={() => setLiked(!liked)}
            aria-pressed={liked}
            className={`flex items-center gap-1.5 text-sm ${liked ? 'text-cherry' : 'text-muted hover:text-ink'}`}
          >
            <Heart className="size-5" fill={liked ? 'currentColor' : 'none'} /> Like
          </button>
        </div>
      </div>

      <ChipInput
        label="What did you taste?"
        value={notes}
        onChange={setNotes}
        suggestions={FLAVOR_SUGGESTIONS}
        max={LIMITS.notesMax}
        placeholder="Add a tasting note"
      />

      <div>
        <label className="label" htmlFor="review">
          Review
        </label>
        <textarea
          id="review"
          rows={5}
          maxLength={LIMITS.reviewMax}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="How was it? Body, acidity, sweetness, how it changed as it cooled…"
          className="field resize-y"
        />
      </div>

      <details className="rounded-md border border-line bg-bg/40 px-3 py-2" open={Boolean(editing?.recipe)}>
        <summary className="cursor-pointer text-sm font-semibold text-muted">Recipe (optional)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <RecipeField label="Dose (g)" value={dose} onChange={setDose} inputMode="decimal" />
          <RecipeField label="Yield (g)" value={yieldG} onChange={setYieldG} inputMode="decimal" />
          <RecipeField label="Temp (°C)" value={temp} onChange={setTemp} inputMode="decimal" />
          <RecipeField label="Grind" value={grind} onChange={setGrind} placeholder="Medium-fine" />
          <RecipeField label="Time" value={time} onChange={setTime} placeholder="3:00" />
        </div>
      </details>

      <ErrorText>{error}</ErrorText>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function RecipeField({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string
  value: string
  onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-dim">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field px-2 py-1.5" {...rest} />
    </label>
  )
}
