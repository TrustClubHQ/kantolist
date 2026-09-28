'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AttributeDef } from '@/lib/attributes'
import { Plate, PlateHeader } from '@/components/ui'
import { listingPath } from '@/lib/listing'
import { PhotoPicker, uploadPendingPhotos, type ListingPhoto } from '@/components/PhotoPicker'

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

/** The listing being edited, when this form is editing rather than posting. */
export interface EditableListing {
  id: string
  type: string
  categoryId: string
  title: string
  description: string
  price: string
  priceUnit: string
  negotiable: boolean
  barangay: string
  attributes: Record<string, string>
}

export function PostForm({
  categories,
  municipalities,
  defaultMunicipalityId,
  contact,
  existing,
  cancelHref,
  photosEnabled = false,
  photos = [],
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
  /** Present when editing: the same form, pre-filled, PATCHing instead of
      POSTing. Keeping one form means a field added to posting is editable
      the same day rather than drifting between two screens. */
  existing?: EditableListing
  /** Where Cancel goes. Back to the listing when editing, home when posting. */
  cancelHref?: string
  /** False when this deployment has no photo storage configured. */
  photosEnabled?: boolean
  /** Photos already on the listing, when editing. */
  photos?: ListingPhoto[]
}) {
  const router = useRouter()
  const [type, setType] = useState<TypeKey>((existing?.type as TypeKey) ?? 'SELL')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [price, setPrice] = useState(existing?.price ?? '')
  const [priceUnit, setPriceUnit] = useState<string>(existing?.priceUnit ?? 'TOTAL')
  const [negotiable, setNegotiable] = useState(existing?.negotiable ?? false)
  // A single launch town is preselected: the form states it instead of asking,
  // so nothing else would set it and the post would fail validation. A profile
  // town that is no longer in the list — left over from an earlier launch area
  // — is ignored rather than carried into a listing that cannot reference it.
  const [municipalityId, setMunicipalityId] = useState(() => {
    if (defaultMunicipalityId && municipalities.some((m) => m.id === defaultMunicipalityId)) {
      return defaultMunicipalityId
    }
    return municipalities.length === 1 ? municipalities[0].id : ''
  })
  const [barangay, setBarangay] = useState(existing?.barangay ?? '')
  const [attributes, setAttributes] = useState<Record<string, string>>(existing?.attributes ?? {})
  // Every channel the seller actually has. There is no longer a per-listing
  // toggle: which apps someone is reachable on is a fact about them, not about
  // a bench they are selling, and the listing page drops anything that has
  // since been cleared from the profile anyway.
  const channels = useMemo(() => {
    const on = ['TRUSTCLUB']
    if (contact.phone) on.push('PHONE', 'SMS')
    if (contact.messenger) on.push('MESSENGER')
    if (contact.viber) on.push('VIBER')
    return on
  }, [contact.phone, contact.messenger, contact.viber])

  const reachableSummary = useMemo(() => {
    const parts: string[] = []
    if (contact.phone) parts.push(`Call & SMS ${contact.phone}`)
    if (contact.messenger) parts.push(`Messenger m.me/${contact.messenger}`)
    if (contact.viber) parts.push(`Viber ${contact.viber}`)
    return parts
  }, [contact.phone, contact.messenger, contact.viber])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])

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

      const payload = {
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
      }

      const res = existing
        ? await fetch(`/api/listings/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data: { id?: string; href?: string; code?: string; slug?: string; error?: string } =
        await res.json()
      if (!res.ok) {
        setError(data.error ?? (existing ? 'Could not save those changes' : 'Could not publish that listing'))
        return
      }
      // Photos could not be attached before the listing had an id.
      if (!existing && data.id && pendingPhotos.length > 0) {
        await uploadPendingPhotos(data.id, pendingPhotos)
      }

      // PATCH answers with the code and slug, since a retitle moves the URL.
      const href = data.href ?? (data.code && data.slug ? listingPath(data.code, data.slug) : null)
      if (!href) {
        setError('Saved, but we could not work out where to send you.')
        return
      }
      router.push(href)
      router.refresh()
    } catch {
      setError(
        existing
          ? 'Could not save. Check your connection and try again.'
          : 'Could not publish. Check your connection and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4">
      <div className="flex flex-col gap-4">
        <Plate>
          <PlateHeader>{existing ? 'What you are selling' : '1 · What are you posting?'}</PlateHeader>
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
          <PlateHeader>{existing ? 'Details' : '2 · Details'}</PlateHeader>
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
          <PlateHeader>{existing ? 'Photos' : '3 · Photos'}</PlateHeader>
          <div className="p-3.5">
            <PhotoPicker
              listingId={existing?.id}
              initial={photos}
              enabled={photosEnabled}
              onPendingChange={setPendingPhotos}
            />
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{existing ? 'Price' : '4 · Price'}</PlateHeader>
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
            <label className="flex min-h-[44px] items-center gap-2.5">
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
          <PlateHeader>{existing ? 'Location' : '5 · Location'}</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            {/* With one launch town there is no choice to make, so it is
                stated rather than asked. The barangay below is the part a
                buyer actually needs. */}
            {municipalities.length === 1 ? (
              <p className="label m-0 text-[17px]">
                {municipalities[0].name}, {municipalities[0].province}
              </p>
            ) : (
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
            )}
            <input
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              placeholder="Barangay or meet-up spot (optional)"
              aria-label="Barangay or meet-up spot"
            />
          </div>
        </Plate>

        {/* A summary, not a control panel. This was four checkboxes, three of
            them greyed out and explaining what to add to a profile — a second
            form embedded in the posting form, at the point where someone is
            trying to finish. The channels a seller has are almost never
            per-listing, so the profile owns them and this just reports the
            result. The link opens a new tab so a half-written listing is not
            lost to a detour. */}
        <Plate>
          <PlateHeader
            right={
              <a
                href="/me/profile"
                target="_blank"
                rel="noopener noreferrer"
                className="label text-[15px] text-yellow underline"
              >
                Edit ↗
              </a>
            }
          >
            {existing ? 'How buyers reach you' : '6 · How buyers reach you'}
          </PlateHeader>
          <div className="flex flex-col gap-2 p-3.5">
            <p className="label m-0 text-[17px]">
              {reachableSummary.length > 0 ? reachableSummary.join(' · ') : 'TrustClub profile only'}
            </p>
            {reachableSummary.length === 0 ? (
              <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
                Add a number or a Messenger handle to your profile and buyers can reach you
                directly. Without one they can only find you through TrustClub.
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
          href={cancelHref ?? '/'}
          className="label flex min-h-[54px] w-[112px] items-center justify-center border-[3px] border-ink bg-panel text-[18px] text-ink hover:text-ink"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="font-display hard flex min-h-[54px] flex-1 items-center justify-center border-[3px] border-ink bg-red text-[21px] uppercase text-ground disabled:opacity-60"
        >
          {busy
            ? existing
              ? 'Saving…'
              : 'Publishing…'
            : existing
              ? 'Save changes'
              : 'Publish listing'}
        </button>
      </div>
    </form>
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
      <label className="flex min-h-[44px] items-center justify-between gap-3 sm:col-span-2">
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
