'use client'

import { useQuery } from 'convex/react'
import { ImagePlus, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { FLAVOR_SUGGESTIONS, LIMITS, ORIGINS, PROCESSES, ROAST_LEVELS } from '@convex/lib/constants'
import { errorMessage } from '~/lib/format'
import { useDebounced, useImageUpload } from '~/lib/hooks'
import { BeanPoster } from './BeanPoster'
import { ChipInput } from './ChipInput'
import { ErrorText } from './ui'

const VARIETY_SUGGESTIONS = [
  'Bourbon',
  'Typica',
  'Caturra',
  'Catuai',
  'Gesha',
  'SL28',
  'SL34',
  'Heirloom',
  'Pacamara',
  'Castillo',
  'Pink Bourbon',
  'S795',
  'Ateng',
]

export type RoasterChoice =
  | { kind: 'existing'; roasterId: Id<'roasters'>; name: string }
  | { kind: 'new'; name: string; location?: string; website?: string }

export type BeanFormValues = {
  roaster: RoasterChoice | null
  name: string
  origin: string
  region: string
  producer: string
  varieties: string[]
  process: string
  roastLevel: string
  altitudeMin: string
  altitudeMax: string
  harvest: string
  roasterNotes: string[]
  description: string
  imageUrl: string | null
}

export const emptyBean: BeanFormValues = {
  roaster: null,
  name: '',
  origin: 'Ethiopia',
  region: '',
  producer: '',
  varieties: [],
  process: 'Washed',
  roastLevel: 'Light',
  altitudeMin: '',
  altitudeMax: '',
  harvest: '',
  roasterNotes: [],
  description: '',
  imageUrl: null,
}

export type BeanSubmit = {
  roaster:
    | { kind: 'existing'; roasterId: Id<'roasters'> }
    | { kind: 'new'; name: string; location?: string; website?: string }
  name: string
  origin: string
  region?: string
  producer?: string
  varieties: string[]
  process: string
  roastLevel: string
  altitudeMin?: number
  altitudeMax?: number
  harvest?: string
  roasterNotes: string[]
  description?: string
  imageId?: Id<'_storage'>
  removeImage: boolean
}

const opt = (s: string) => s.trim() || undefined
const optNum = (s: string) => (s.trim() === '' ? undefined : Number(s))

export function BeanForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: BeanFormValues
  submitLabel: string
  onSubmit: (values: BeanSubmit) => Promise<void>
}) {
  const [v, setV] = useState(initial)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initial.imageUrl)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const upload = useImageUpload()
  const set = <K extends keyof BeanFormValues>(k: K, value: BeanFormValues[K]) =>
    setV((s) => ({ ...s, [k]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!v.roaster) {
      setError('Pick or add the roaster.')
      return
    }
    setSaving(true)
    try {
      const imageId = file ? await upload(file) : undefined
      await onSubmit({
        roaster:
          v.roaster.kind === 'existing'
            ? { kind: 'existing', roasterId: v.roaster.roasterId }
            : {
                kind: 'new',
                name: v.roaster.name,
                location: opt(v.roaster.location ?? ''),
                website: opt(v.roaster.website ?? ''),
              },
        name: v.name,
        origin: v.origin,
        region: opt(v.region),
        producer: opt(v.producer),
        varieties: v.varieties,
        process: v.process,
        roastLevel: v.roastLevel,
        altitudeMin: optNum(v.altitudeMin),
        altitudeMax: optNum(v.altitudeMax),
        harvest: opt(v.harvest),
        roasterNotes: v.roasterNotes,
        description: opt(v.description),
        imageId,
        removeImage: !preview && Boolean(initial.imageUrl),
      })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8 md:grid-cols-[1fr_220px]">
      <div className="space-y-5">
        <RoasterField value={v.roaster} onChange={(r) => set('roaster', r)} />

        <div>
          <label className="label" htmlFor="name">
            Bean name
          </label>
          <input
            id="name"
            required
            maxLength={LIMITS.nameMax}
            value={v.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Guji Hambela, House Espresso"
            className="field"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Origin" value={v.origin} onChange={(x) => set('origin', x)} options={ORIGINS} />
          <SelectField label="Process" value={v.process} onChange={(x) => set('process', x)} options={PROCESSES} />
          <SelectField label="Roast" value={v.roastLevel} onChange={(x) => set('roastLevel', x)} options={ROAST_LEVELS} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Region" value={v.region} onChange={(x) => set('region', x)} placeholder="e.g. Huila, Guji, Aceh" />
          <TextField label="Producer / farm" value={v.producer} onChange={(x) => set('producer', x)} placeholder="Optional" />
        </div>

        <ChipInput
          label="Varieties"
          value={v.varieties}
          onChange={(x) => set('varieties', x)}
          suggestions={VARIETY_SUGGESTIONS}
          max={LIMITS.varietiesMax}
          placeholder="Add a variety"
        />

        <div className="grid grid-cols-3 gap-4">
          <TextField label="Altitude from (m)" value={v.altitudeMin} onChange={(x) => set('altitudeMin', x)} inputMode="numeric" placeholder="1800" />
          <TextField label="to (m)" value={v.altitudeMax} onChange={(x) => set('altitudeMax', x)} inputMode="numeric" placeholder="2100" />
          <TextField label="Harvest" value={v.harvest} onChange={(x) => set('harvest', x)} placeholder="2025" />
        </div>

        <ChipInput
          label="Tasting notes on the bag"
          value={v.roasterNotes}
          onChange={(x) => set('roasterNotes', x)}
          suggestions={FLAVOR_SUGGESTIONS}
          max={LIMITS.notesMax}
          placeholder="Add a note"
        />

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            maxLength={LIMITS.descriptionMax}
            value={v.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What the roaster says about it (optional)"
            className="field"
          />
        </div>

        <ErrorText>{error}</ErrorText>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>

      <div className="order-first md:order-none">
        <p className="label">Preview</p>
        <div className="mx-auto w-40 md:w-full">
          <BeanPoster
            bean={{
              name: v.name || 'Bean name',
              roasterName: v.roaster?.name || 'Roaster',
              origin: v.origin,
              process: v.process,
              roastLevel: v.roastLevel,
              imageUrl: preview,
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
            <ImagePlus className="size-4" /> {preview ? 'Replace photo' : 'Add a photo'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setFile(f)
                setPreview(URL.createObjectURL(f))
              }}
            />
          </label>
          {preview && (
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
            >
              <X className="size-4" /> Remove
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-dim">
          No photo? We'll design a bag for it.
        </p>
      </div>
    </form>
  )
}

function TextField({
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
      <span className="label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field" {...rest} />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

function RoasterField({
  value,
  onChange,
}: {
  value: RoasterChoice | null
  onChange: (r: RoasterChoice | null) => void
}) {
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim(), 200)
  const results = useQuery(api.roasters.search, value ? 'skip' : { q: term })

  if (value) {
    return (
      <div>
        <span className="label">Roaster</span>
        <div className="field flex items-center justify-between gap-2">
          <span className="font-semibold">
            {value.name}
            {value.kind === 'new' && <span className="ml-2 text-xs font-normal text-leaf">new roaster</span>}
          </span>
          <button type="button" className="text-xs text-dim hover:text-ink" onClick={() => onChange(null)}>
            Change
          </button>
        </div>
        {value.kind === 'new' && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={value.location ?? ''}
              onChange={(e) => onChange({ ...value, location: e.target.value })}
              placeholder="Roaster city (optional)"
              className="field"
              aria-label="Roaster city"
            />
            <input
              value={value.website ?? ''}
              onChange={(e) => onChange({ ...value, website: e.target.value })}
              placeholder="Website (optional)"
              className="field"
              aria-label="Roaster website"
            />
          </div>
        )}
      </div>
    )
  }

  const exact = results?.some((r) => r.name.toLowerCase() === term.toLowerCase())
  return (
    <div>
      <label className="label" htmlFor="roaster">
        Roaster
      </label>
      <input
        id="roaster"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Who roasted it?"
        className="field"
        autoComplete="off"
      />
      <ul className="mt-1 overflow-hidden rounded-md border border-line bg-surface">
        {results?.map((r) => (
          <li key={r._id}>
            <button
              type="button"
              className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-raised"
              onClick={() => onChange({ kind: 'existing', roasterId: r._id, name: r.name })}
            >
              <span className="font-semibold">{r.name}</span>
              <span className="text-xs text-dim">{r.location}</span>
            </button>
          </li>
        ))}
        {term && !exact && (
          <li>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-leaf hover:bg-raised"
              onClick={() => onChange({ kind: 'new', name: term })}
            >
              + Add new roaster “{term}”
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
