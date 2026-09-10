'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AttributeDef } from '@/lib/attributes'
import { Plate, PlateHeader } from '@/components/ui'

/**
 * One scrolling form, numbered sections. The category's attribute schema drives
 * section 3, so what a poster is asked changes with what they are selling.
 */

interface CategoryNode {
  id: string
  name: string
  children: { id: string; name: string; attributes: AttributeDef[] }[]
}

const TYPES = [
  { key: 'SELL', label: 'Sell', units: [{ key: 'TOTAL', label: 'total' }] },
  {
    key: 'RENT',
    label: 'Rent out',
    units: [
      { key: 'PER_DAY', label: 'per day' },
      { key: 'PER_WEEK', label: 'per week' },
      { key: 'PER_MONTH', label: 'per month' },
      { key: 'PER_HOUR', label: 'per hour' },
    ],
  },
  {
    key: 'SERVICE',
    label: 'Offer a service',
    units: [
      { key: 'PER_JOB', label: 'per job' },
      { key: 'PER_HOUR', label: 'per hour' },
      { key: 'QUOTE', label: 'ask for a quote' },
    ],
  },
] as const

type TypeKey = (typeof TYPES)[number]['key']

export function PostForm({
  categories,
  municipalities,
  defaultMunicipalityId,
  contact,
}: {
  categories: CategoryNode[]
  municipalities: { id: string; name: string; province: string }[]
  defaultMunicipalityId: string | null
  contact: {
    phone: string | null
    phoneVerified: boolean
    messenger: string | null
    facebook: string | null
    viber: string | null
  }
}) {
  const router = useRouter()
  const [type, setType] = useState<TypeKey>('SELL')
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState<string>('TOTAL')
  const [negotiable, setNegotiable] = useState(false)
  const [municipalityId, setMunicipalityId] = useState(defaultMunicipalityId ?? '')
  const [barangay, setBarangay] = useState('')
  const [attributes, setAttributes] = useState<Record<string, string>>({})
  const [channels, setChannels] = useState<string[]>(() => {
    const initial = ['TRUSTCLUB']
    if (contact.phone) initial.push('PHONE', 'SMS')
    if (contact.messenger) initial.push('MESSENGER')
    return initial
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const currentType = TYPES.find((t) => t.key === type)!
  const leaf = useMemo(
    () => categories.flatMap((c) => c.children).find((c) => c.id === categoryId),
    [categories, categoryId],
  )

  function chooseType(next: TypeKey) {
    setType(next)
    // The old unit is usually invalid for the new type, so reset to its first.
    const unit = TYPES.find((t) => t.key === next)!.units[0].key
    setPriceUnit(unit)
  }

  function setAttr(key: string, value: string) {
    setAttributes((a) => ({ ...a, [key]: value }))
  }

  function toggleChannel(channel: string) {
    if (channel === 'TRUSTCLUB') return // always on: it is how a buyer checks you
    setChannels((c) => (c.includes(channel) ? c.filter((x) => x !== channel) : [...c, channel]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const parsed: Record<string, string | number | boolean> = {}
      for (const def of leaf?.attributes ?? []) {
        const raw = attributes[def.key]
        if (raw === undefined || raw === '') continue
        parsed[def.key] = def.type === 'int' ? Number(raw) : def.type === 'bool' ? raw === 'true' : raw
      }

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          categoryId,
          title,
          description,
          price: priceUnit === 'QUOTE' ? null : Number(price),
          priceUnit,
          negotiable,
          municipalityId,
          barangay,
          attributes: parsed,
          contactChannels: channels,
        }),
      })
      const data: { href?: string; error?: string } = await res.json()
      if (!res.ok || !data.href) {
        setError(data.error ?? 'Could not publish that listing')
        return
      }
      router.push(data.href)
    } catch {
      setError('Could not publish. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4">
      <div className="flex flex-col gap-4">
        <Plate>
          <PlateHeader>1 · What are you posting?</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => chooseType(t.key)}
                  className={`label min-h-[70px] border-[2.5px] border-ink px-2 text-[15px] ${
                    type === t.key ? 'bg-yellow' : 'bg-ground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">Category</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Choose a category…</option>
                {categories.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    {parent.children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>2 · Details</PlateHeader>
          <div className="flex flex-col gap-3.5 p-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={70}
                required
                placeholder="Honda Click 125i, daily rental"
              />
              <span className="text-xs font-semibold text-muted">{70 - title.length} characters left</span>
            </label>

            {leaf ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {leaf.attributes.map((def) => (
                  <AttributeInput key={def.key} def={def} value={attributes[def.key] ?? ''} onChange={setAttr} />
                ))}
              </div>
            ) : (
              <p className="label m-0 text-[16px] text-muted">Choose a category to see its questions.</p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                placeholder="Describe the condition, what's included, pick-up or delivery…"
              />
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>3 · Price</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex gap-2.5">
              <div className="flex flex-1 items-center gap-2 border-[2.5px] border-ink bg-ground px-3">
                <span className="font-display text-[21px] text-muted">₱</span>
                <input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                  disabled={priceUnit === 'QUOTE'}
                  required={priceUnit !== 'QUOTE'}
                  aria-label="Price"
                  placeholder={priceUnit === 'QUOTE' ? 'No price' : '0'}
                  className="!border-0 !bg-transparent !px-0 font-display text-[24px] text-red"
                />
              </div>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                aria-label="Price unit"
                className="w-[150px]"
              >
                {currentType.units.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={negotiable}
                onChange={(e) => setNegotiable(e.target.checked)}
                className="!min-h-0 !w-auto h-5 w-5 accent-green"
              />
              <span className="label text-[17px]">Price is negotiable</span>
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>4 · Location</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <select
              value={municipalityId}
              onChange={(e) => setMunicipalityId(e.target.value)}
              required
              aria-label="Municipality"
            >
              <option value="">Choose your town…</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}, {m.province}
                </option>
              ))}
            </select>
            <input
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              placeholder="Barangay or meet-up spot (optional)"
              aria-label="Barangay or meet-up spot"
            />
          </div>
        </Plate>

        <Plate>
          <PlateHeader>5 · How buyers reach you</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <ChannelRow
              label={contact.phone ? `Call & SMS · ${contact.phone}` : 'Call & SMS — add a number in your profile'}
              checked={channels.includes('PHONE')}
              disabled={!contact.phone}
              verified={contact.phoneVerified}
              onToggle={() => {
                toggleChannel('PHONE')
                toggleChannel('SMS')
              }}
            />
            <ChannelRow
              label={contact.messenger ? `Messenger · m.me/${contact.messenger}` : 'Messenger — add a handle in your profile'}
              checked={channels.includes('MESSENGER')}
              disabled={!contact.messenger}
              onToggle={() => toggleChannel('MESSENGER')}
            />
            <ChannelRow
              label={contact.viber ? `Viber · ${contact.viber}` : 'Viber — add a number in your profile'}
              checked={channels.includes('VIBER')}
              disabled={!contact.viber}
              onToggle={() => toggleChannel('VIBER')}
            />
            <ChannelRow label="TrustClub profile" checked disabled onToggle={() => {}} alwaysOn />
            {!contact.phone && !contact.messenger ? (
              <p className="label m-0 border-2 border-ink bg-yellow px-3 py-2 text-[16px] text-ink">
                Add at least one way to reach you in <Link href="/me/profile">your profile</Link>, or
                buyers can only find you through TrustClub.
              </p>
            ) : null}
          </div>
        </Plate>

        <div className="flex items-start gap-2.5 border-[3px] border-ink bg-green px-3.5 py-3">
          <p className="m-0 text-[13px] font-semibold leading-snug text-green-soft">
            Your listing ranks higher for people whose TrustClub network reaches you. Ask the people
            you have dealt with to trust you on TrustClub.
          </p>
        </div>

        {error ? (
          <p className="label m-0 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">{error}</p>
        ) : null}
      </div>

      <div className="sticky bottom-0 mt-4 flex gap-2.5 border-t-4 border-ink bg-ground py-3">
        <Link
          href="/"
          className="label flex min-h-[54px] w-[112px] items-center justify-center border-[3px] border-ink bg-panel text-[18px] text-ink hover:text-ink"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="font-display hard flex min-h-[54px] flex-1 items-center justify-center border-[3px] border-ink bg-red text-[21px] uppercase text-ground disabled:opacity-60"
        >
          {busy ? 'Publishing…' : 'Publish listing'}
        </button>
      </div>
    </form>
  )
}

function ChannelRow({
  label,
  checked,
  disabled,
  verified,
  alwaysOn,
  onToggle,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  verified?: boolean
  alwaysOn?: boolean
  onToggle: () => void
}) {
  return (
    <label className={`flex items-center gap-2.5 ${disabled && !alwaysOn ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="!min-h-0 !w-auto h-5 w-5 accent-green"
      />
      <span className="label flex-1 text-[17px]">{label}</span>
      {verified ? (
        <span className="label border-2 border-ink bg-green px-2 py-0.5 text-[13px] text-ground">Verified</span>
      ) : null}
    </label>
  )
}

function AttributeInput({
  def,
  value,
  onChange,
}: {
  def: AttributeDef
  value: string
  onChange: (key: string, value: string) => void
}) {
  if (def.type === 'enum') {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="label text-[15px] text-muted">{def.label}</span>
        <select value={value} onChange={(e) => onChange(def.key, e.target.value)} required={def.required}>
          <option value="">Choose…</option>
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (def.type === 'bool') {
    return (
      <label className="flex items-center justify-between gap-3 sm:col-span-2">
        <span className="label text-[17px]">{def.label}</span>
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(def.key, e.target.checked ? 'true' : 'false')}
          className="!min-h-0 !w-auto h-5 w-5 accent-green"
        />
      </label>
    )
  }

  if (def.type === 'int') {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="label text-[15px] text-muted">
          {def.label}
          {def.unit ? ` (${def.unit})` : ''}
        </span>
        <input
          inputMode="numeric"
          value={value}
          min={def.min}
          max={def.max}
          required={def.required}
          onChange={(e) => onChange(def.key, e.target.value.replace(/\D/g, ''))}
        />
      </label>
    )
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="label text-[15px] text-muted">{def.label}</span>
      <input value={value} maxLength={120} required={def.required} onChange={(e) => onChange(def.key, e.target.value)} />
    </label>
  )
}
