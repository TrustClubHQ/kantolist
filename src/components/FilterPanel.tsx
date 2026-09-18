'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { AttributeDef } from '@/lib/attributes'

/**
 * Filtering, sized for a phone.
 *
 * The rail used to render every category and every attribute expanded at once —
 * 36 category buttons plus a chip for every enum option. On a phone that is a
 * screenful of controls above the first listing, and picking a category made it
 * worse rather than better. Three things keep it short:
 *
 *  - the category tree is an accordion: parents only, children for the open one
 *  - each attribute collapses, and opens only when it is actually filtering
 *  - on mobile the whole panel lives in a sheet behind a Filters button, so the
 *    listings are the first thing on screen
 */

interface Category {
  id: string
  slug: string
  name: string
  parentId: string | null
}

interface Props {
  categories: Category[]
  municipalities: { id: string; name: string; province: string }[]
  attributes: AttributeDef[]
  current: Record<string, string>
}

/** Keys that are not filters, so they never count towards the badge. */
const NON_FILTER_KEYS = new Set(['sort', 'page', 'q'])

function countActive(current: Record<string, string>): number {
  // A range contributes one filter, not two, so _min/_max collapse to a stem.
  const stems = new Set<string>()
  for (const [k, v] of Object.entries(current)) {
    if (!v || NON_FILTER_KEYS.has(k)) continue
    stems.add(k.replace(/_(min|max)$/, ''))
  }
  return stems.size
}

export function FilterControls(props: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = countActive(props.current)

  return (
    <>
      {/* Mobile: a bar, not a panel. Listings start immediately below it. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label hard-sm flex w-full items-center justify-between border-[3px] border-ink bg-panel px-3.5 py-2.5 text-[17px]"
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
          </span>
          {activeCount > 0 ? (
            <span className="label border-2 border-ink bg-yellow px-2 py-0.5 text-[14px]">
              {activeCount} on
            </span>
          ) : (
            <span className="label text-[15px] text-muted">All listings</span>
          )}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(23,19,14,0.6)] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[85vh] overflow-y-auto border-t-4 border-ink bg-ground">
            <FilterPanel {...props} onDone={() => setOpen(false)} sheet />
          </div>
        </div>
      ) : null}

      <div className="hidden lg:block">
        <FilterPanel {...props} />
      </div>
    </>
  )
}

function FilterPanel({
  categories,
  municipalities,
  attributes,
  current,
  onDone,
  sheet = false,
}: Props & { onDone?: () => void; sheet?: boolean }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, string>>(current)

  const tree = useMemo(() => {
    const parents = categories.filter((c) => !c.parentId)
    return parents.map((p) => ({ ...p, children: categories.filter((c) => c.parentId === p.id) }))
  }, [categories])

  // Open the branch holding the current selection, so the chosen category is
  // visible on arrival without expanding the other seven.
  const [openParent, setOpenParent] = useState<string | null>(() => {
    const selected = categories.find((c) => c.slug === draft.category)
    if (!selected) return null
    return selected.parentId ?? selected.id
  })

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
    onDone?.()
  }

  function reset() {
    setDraft({})
    router.push('/browse')
    onDone?.()
  }

  const selectedCategoryName = categories.find((c) => c.slug === draft.category)?.name
  // `attributes` was resolved server-side from the *applied* category, so the
  // heading over them has to name that one — not the draft the user is still
  // picking, which would label bike attributes "Motorcycles".
  const appliedCategoryName = categories.find((c) => c.slug === current.category)?.name

  return (
    <div className={sheet ? '' : 'hard border-[3px] border-ink bg-panel'}>
      <div className="label sticky top-0 z-10 flex items-baseline justify-between bg-ink px-3.5 py-2 text-[18px] tracking-wide text-ground">
        <span>Filters</span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={reset} className="label text-yellow">
            Reset
          </button>
          {sheet ? (
            <button type="button" onClick={onDone} aria-label="Close filters" className="label text-ground">
              ✕
            </button>
          ) : null}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <Section
          label="Category"
          summary={selectedCategoryName ?? 'All categories'}
          defaultOpen={!draft.category}
        >
          <div className="flex flex-col gap-1.5">
            {tree.map((parent) => {
              const expanded = openParent === parent.id
              const childSelected = parent.children.some((c) => c.slug === draft.category)
              return (
                <div key={parent.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setOpenParent(expanded ? null : parent.id)}
                    className={`label flex items-center justify-between border-2 border-ink px-2.5 py-2 text-left text-[17px] ${
                      draft.category === parent.slug || childSelected ? 'bg-yellow' : 'bg-ground'
                    }`}
                  >
                    {parent.name}
                    <Chevron open={expanded} />
                  </button>

                  {expanded ? (
                    <div className="ml-3 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => set('category', parent.slug)}
                        className={`label border-2 px-2.5 py-1.5 text-left text-[16px] ${
                          draft.category === parent.slug
                            ? 'border-ink bg-yellow'
                            : 'border-dim-edge bg-panel text-muted-2'
                        }`}
                      >
                        Everything in {parent.name}
                      </button>
                      {parent.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => set('category', child.slug)}
                          className={`label border-2 px-2.5 py-1.5 text-left text-[16px] ${
                            draft.category === child.slug
                              ? 'border-ink bg-yellow'
                              : 'border-dim-edge bg-panel text-muted-2'
                          }`}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Section>

        <Section label="Listing type" summary={typeLabel(draft.type)} defaultOpen={false}>
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
        </Section>

        <Section
          label="Price"
          summary={priceSummary(draft.min, draft.max)}
          defaultOpen={!!(draft.min || draft.max)}
        >
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              placeholder="Any"
              aria-label="Minimum price"
              value={draft.min ?? ''}
              onChange={(e) => set('min', e.target.value.replace(/\D/g, ''))}
              className="!min-h-[44px] text-[15px]"
            />
            <span className="label text-muted">to</span>
            <input
              inputMode="numeric"
              placeholder="Any"
              aria-label="Maximum price"
              value={draft.max ?? ''}
              onChange={(e) => set('max', e.target.value.replace(/\D/g, ''))}
              className="!min-h-[44px] text-[15px]"
            />
          </div>
        </Section>

        <Section
          label="Location"
          summary={
            municipalities.find((m) => m.id === draft.municipality)?.name ??
            (draft.nearby === 'true' ? 'Nearby towns' : 'Anywhere')
          }
          defaultOpen={false}
        >
          <div className="flex flex-col gap-2">
            <select
              aria-label="Municipality"
              value={draft.municipality ?? ''}
              onChange={(e) => set('municipality', e.target.value || undefined)}
              className="!min-h-[44px] text-[15px]"
            >
              <option value="">Anywhere</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}, {m.province}
                </option>
              ))}
            </select>
            <label className="flex min-h-[44px] items-center gap-2">
              <input
                type="checkbox"
                checked={draft.nearby === 'true'}
                onChange={(e) => set('nearby', e.target.checked ? 'true' : undefined)}
                className="!min-h-0 !w-auto h-5 w-5 accent-green"
              />
              <span className="label text-[16px]">Include nearby towns</span>
            </label>
          </div>
        </Section>

        {attributes.length > 0 ? (
          <div className="flex flex-col gap-4 border-t-[3px] border-ink pt-4">
            <span className="font-display text-[18px] uppercase text-red">
              {appliedCategoryName ?? 'Details'}
            </span>
            {attributes
              .filter((a) => a.filterable !== false)
              .map((attr) => (
                <AttributeFilter key={attr.key} attr={attr} draft={draft} set={set} />
              ))}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 border-t-[3px] border-ink bg-ground p-3">
        <button
          type="button"
          onClick={apply}
          className="font-display hard-sm min-h-[52px] w-full border-[3px] border-ink bg-red text-[19px] uppercase text-ground"
        >
          Show results
        </button>
      </div>
    </div>
  )
}

/**
 * A titled section that collapses. When closed it still reports what it is
 * filtering on, so the panel reads as a summary rather than a wall of inputs.
 */
function Section({
  label,
  summary,
  defaultOpen,
  children,
}: {
  label: string
  summary: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-baseline justify-between gap-3 text-left"
      >
        <span className="label text-[15px] text-muted">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="label max-w-[11rem] truncate text-[16px] text-ink">{summary}</span>
          <Chevron open={open} />
        </span>
      </button>
      {open ? children : null}
    </section>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : undefined, flexShrink: 0 }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function typeLabel(v: string | undefined): string {
  if (v === 'SELL') return 'For sale'
  if (v === 'RENT') return 'For rent'
  if (v === 'SERVICE') return 'Services'
  return 'All'
}

function priceSummary(min: string | undefined, max: string | undefined): string {
  const f = (n: string) => '₱' + Number(n).toLocaleString('en-PH')
  if (min && max) return `${f(min)} – ${f(max)}`
  if (min) return `${f(min)} and up`
  if (max) return `Up to ${f(max)}`
  return 'Any'
}

function attributeSummary(attr: AttributeDef, draft: Record<string, string>): string {
  if (attr.type === 'int') {
    const min = draft[`${attr.key}_min`]
    const max = draft[`${attr.key}_max`]
    const unit = attr.unit ? ` ${attr.unit}` : ''
    if (min && max) return `${min}–${max}${unit}`
    if (min) return `${min}${unit} and up`
    if (max) return `Up to ${max}${unit}`
    return 'Any'
  }
  if (attr.type === 'bool') return draft[attr.key] === 'true' ? 'Yes' : 'Any'
  return draft[attr.key] ?? 'Any'
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
  const summary = attributeSummary(attr, draft)
  const active = summary !== 'Any'
  const label = attr.label + (attr.unit && attr.type === 'int' ? ` (${attr.unit})` : '')

  // A bool is a single switch — a collapsible section around one checkbox is
  // more chrome than control, so it stays inline.
  if (attr.type === 'bool') {
    return (
      <label className="flex min-h-[44px] items-center justify-between gap-3">
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

  return (
    <Section label={label} summary={summary} defaultOpen={active}>
      {attr.type === 'enum' ? (
        <div className="flex flex-wrap gap-1.5">
          {(attr.options ?? []).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => set(attr.key, draft[attr.key] === option ? undefined : option)}
              className={`label border-[2.5px] border-ink px-2.5 py-1.5 text-[15px] ${
                draft[attr.key] === option ? 'bg-yellow' : 'bg-ground'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : attr.buckets?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {attr.buckets.map((b) => {
            const isOn =
              (draft[`${attr.key}_min`] ?? '') === (b.min?.toString() ?? '') &&
              (draft[`${attr.key}_max`] ?? '') === (b.max?.toString() ?? '')
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  set(`${attr.key}_min`, isOn ? undefined : b.min?.toString())
                  set(`${attr.key}_max`, isOn ? undefined : b.max?.toString())
                }}
                className={`label border-[2.5px] border-ink px-2.5 py-1.5 text-[15px] ${isOn ? 'bg-yellow' : 'bg-ground'}`}
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
            className="!min-h-[44px] text-[15px]"
          />
          <input
            inputMode="numeric"
            placeholder="Max"
            aria-label={`Maximum ${attr.label}`}
            value={draft[`${attr.key}_max`] ?? ''}
            onChange={(e) => set(`${attr.key}_max`, e.target.value.replace(/\D/g, ''))}
            className="!min-h-[44px] text-[15px]"
          />
        </div>
      )}
    </Section>
  )
}
