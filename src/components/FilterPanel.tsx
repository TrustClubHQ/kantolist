'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { AttributeDef } from '@/lib/attributes'

/**
 * The filter rail. The universal filters are fixed; everything below the rule
 * is generated from the selected category's attribute schema, which is why
 * adding a filter is seed data rather than a deploy.
 */
export function FilterPanel({
  categories,
  municipalities,
  attributes,
  current,
}: {
  categories: { id: string; slug: string; name: string; parentId: string | null }[]
  municipalities: { id: string; name: string; province: string }[]
  attributes: AttributeDef[]
  current: Record<string, string>
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, string>>(current)

  const tree = useMemo(() => {
    const parents = categories.filter((c) => !c.parentId)
    return parents.map((p) => ({ ...p, children: categories.filter((c) => c.parentId === p.id) }))
  }, [categories])

  function set(key: string, value: string | undefined) {
    setDraft((d) => {
      const next = { ...d }
      if (value === undefined || value === '') delete next[key]
      else next[key] = value
      return next
    })
  }

  function apply() {
    const params = new URLSearchParams(draft)
    params.delete('page')
    router.push(`/browse?${params.toString()}`)
  }

  function reset() {
    setDraft({})
    router.push('/browse')
  }

  return (
    <div className="hard border-[3px] border-ink bg-panel">
      <div className="label flex items-baseline justify-between bg-ink px-3.5 py-1.5 text-[18px] tracking-wide text-ground">
        <span>Filters</span>
        <button type="button" onClick={reset} className="label text-yellow">
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <span className="label text-[15px] text-muted">Category</span>
          {tree.map((parent) => (
            <div key={parent.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => set('category', parent.slug)}
                className={`label border-2 px-2.5 py-1.5 text-left text-[17px] ${
                  draft.category === parent.slug ? 'border-ink bg-yellow' : 'border-ink bg-ground'
                }`}
              >
                {parent.name}
              </button>
              <div className="ml-3 flex flex-col gap-1">
                {parent.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => set('category', child.slug)}
                    className={`label border-2 px-2.5 py-1 text-left text-[16px] ${
                      draft.category === child.slug
                        ? 'border-ink bg-yellow'
                        : 'border-dim-edge bg-panel text-muted-2'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <span className="label text-[15px] text-muted">Listing type</span>
          <div className="flex gap-1.5">
            {[
              { key: undefined, label: 'All' },
              { key: 'SELL', label: 'Sale' },
              { key: 'RENT', label: 'Rent' },
              { key: 'SERVICE', label: 'Service' },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => set('type', t.key)}
                className={`label flex-1 border-[2.5px] border-ink py-2 text-[15px] ${
                  (draft.type ?? undefined) === t.key ? 'bg-ink text-ground' : 'bg-ground text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <span className="label text-[15px] text-muted">Price (₱)</span>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              placeholder="Any"
              aria-label="Minimum price"
              value={draft.min ?? ''}
              onChange={(e) => set('min', e.target.value.replace(/\D/g, ''))}
              className="!min-h-[42px] text-[15px]"
            />
            <span className="label text-muted">to</span>
            <input
              inputMode="numeric"
              placeholder="Any"
              aria-label="Maximum price"
              value={draft.max ?? ''}
              onChange={(e) => set('max', e.target.value.replace(/\D/g, ''))}
              className="!min-h-[42px] text-[15px]"
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <span className="label text-[15px] text-muted">Location</span>
          <select
            aria-label="Municipality"
            value={draft.municipality ?? ''}
            onChange={(e) => set('municipality', e.target.value || undefined)}
            className="!min-h-[42px] text-[15px]"
          >
            <option value="">Anywhere</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}, {m.province}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.nearby === 'true'}
              onChange={(e) => set('nearby', e.target.checked ? 'true' : undefined)}
              className="!min-h-0 !w-auto !border-[2.5px] h-5 w-5 accent-green"
            />
            <span className="label text-[16px]">Include nearby towns</span>
          </label>
        </section>

        {attributes.length > 0 ? (
          <section className="flex flex-col gap-4 border-t-[3px] border-ink pt-4">
            <span className="font-display text-[18px] uppercase text-red">Details</span>
            {attributes
              .filter((a) => a.filterable !== false)
              .map((attr) => (
                <AttributeFilter key={attr.key} attr={attr} draft={draft} set={set} />
              ))}
          </section>
        ) : null}

        <button
          type="button"
          onClick={apply}
          className="font-display hard-sm min-h-[50px] border-[3px] border-ink bg-red text-[19px] uppercase text-ground"
        >
          Apply filters
        </button>
      </div>
    </div>
  )
}

function AttributeFilter({
  attr,
  draft,
  set,
}: {
  attr: AttributeDef
  draft: Record<string, string>
  set: (key: string, value: string | undefined) => void
}) {
  if (attr.type === 'enum') {
    return (
      <div className="flex flex-col gap-2">
        <span className="label text-[15px] text-muted">{attr.label}</span>
        <div className="flex flex-wrap gap-1.5">
          {(attr.options ?? []).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => set(attr.key, draft[attr.key] === option ? undefined : option)}
              className={`label border-[2.5px] border-ink px-2.5 py-1 text-[15px] ${
                draft[attr.key] === option ? 'bg-yellow' : 'bg-ground'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (attr.type === 'bool') {
    return (
      <label className="flex items-center justify-between gap-3">
        <span className="label text-[16px]">{attr.label}</span>
        <input
          type="checkbox"
          checked={draft[attr.key] === 'true'}
          onChange={(e) => set(attr.key, e.target.checked ? 'true' : undefined)}
          className="!min-h-0 !w-auto h-5 w-5 accent-green"
        />
      </label>
    )
  }

  if (attr.type === 'int') {
    // Buckets are the fast path for the common ranges; the two boxes stay for
    // anything the buckets do not cover.
    return (
      <div className="flex flex-col gap-2">
        <span className="label text-[15px] text-muted">
          {attr.label}
          {attr.unit ? ` (${attr.unit})` : ''}
        </span>
        {attr.buckets?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {attr.buckets.map((b) => {
              const active =
                draft[`${attr.key}_min`] === (b.min?.toString() ?? '') &&
                draft[`${attr.key}_max`] === (b.max?.toString() ?? '')
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => {
                    if (active) {
                      set(`${attr.key}_min`, undefined)
                      set(`${attr.key}_max`, undefined)
                    } else {
                      set(`${attr.key}_min`, b.min?.toString())
                      set(`${attr.key}_max`, b.max?.toString())
                    }
                  }}
                  className={`label border-[2.5px] border-ink px-2.5 py-1 text-[15px] ${active ? 'bg-yellow' : 'bg-ground'}`}
                >
                  {b.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              placeholder="Min"
              aria-label={`Minimum ${attr.label}`}
              value={draft[`${attr.key}_min`] ?? ''}
              onChange={(e) => set(`${attr.key}_min`, e.target.value.replace(/\D/g, ''))}
              className="!min-h-[42px] text-[15px]"
            />
            <input
              inputMode="numeric"
              placeholder="Max"
              aria-label={`Maximum ${attr.label}`}
              value={draft[`${attr.key}_max`] ?? ''}
              onChange={(e) => set(`${attr.key}_max`, e.target.value.replace(/\D/g, ''))}
              className="!min-h-[42px] text-[15px]"
            />
          </div>
        )}
      </div>
    )
  }

  return null
}
