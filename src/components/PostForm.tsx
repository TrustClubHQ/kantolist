'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AttributeDef } from '@/lib/attributes'
import { Plate, PlateHeader, Spinner } from '@/components/ui'
import { useT } from '@/components/LanguageProvider'
import { attributeLabel, categoryName } from '@/lib/i18n'
import { listingPath } from '@/lib/listing'
import { PhotoPicker, uploadPendingPhotos, type ListingPhoto } from '@/components/PhotoPicker'

/**
 * One scrolling form, numbered sections. The category's attribute schema drives
 * section 3, so what a poster is asked changes with what they are selling.
 */

interface CategoryNode {
  id: string
  /** Carried so the name can be translated; the stored name is the fallback. */
  slug: string
  name: string
  children: { id: string; slug: string; name: string; attributes: AttributeDef[] }[]
}

const TYPES = [
  { key: 'SELL', units: ['TOTAL'] },
  { key: 'RENT', units: ['PER_DAY', 'PER_WEEK', 'PER_MONTH', 'PER_HOUR'] },
  { key: 'SERVICE', units: ['PER_JOB', 'PER_HOUR', 'QUOTE'] },
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
  videoUrl: string | null
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
  const t = useT()
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
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl ?? '')
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
    if (contact.phone) parts.push(t('post.contact.call', { phone: contact.phone }))
    if (contact.messenger) parts.push(t('post.contact.messenger', { handle: contact.messenger }))
    if (contact.viber) parts.push(t('post.contact.viber', { number: contact.viber }))
    return parts
  }, [contact.phone, contact.messenger, contact.viber, t])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // What the button says while it works. Publishing is several round trips —
  // the listing, then a photo at a time — and counting them off is the
  // difference between "working" and "stuck".
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [publishedWithoutPhotos, setPublishedWithoutPhotos] = useState<{
    href: string
    message: string
  } | null>(null)

  const currentType = TYPES.find((entry) => entry.key === type)!
  const leaf = useMemo(
    () => categories.flatMap((c) => c.children).find((c) => c.id === categoryId),
    [categories, categoryId],
  )

  function chooseType(next: TypeKey) {
    setType(next)
    // The old unit is usually invalid for the new type, so reset to its first.
    const unit = TYPES.find((entry) => entry.key === next)!.units[0]
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
        videoUrl,
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
        setError(data.error ?? t(existing ? 'post.error.save' : 'post.error.publish'))
        return
      }
      // Photos could not be attached before the listing had an id. If they
      // fail, the listing still stands — but say so, and stay put with a link
      // to the edit screen rather than navigating away from the only place
      // the problem was visible.
      if (!existing && data.id && pendingPhotos.length > 0) {
        const outcome = await uploadPendingPhotos(data.id, pendingPhotos, (done, total) =>
          setProgress({ done, total }),
        )
        if (outcome.failed > 0) {
          setPublishedWithoutPhotos({
            href: data.href ?? '/',
            message: outcome.error ?? 'The photos could not be added.',
          })
          return
        }
      }

      // PATCH answers with the code and slug, since a retitle moves the URL.
      const href = data.href ?? (data.code && data.slug ? listingPath(data.code, data.slug) : null)
      if (!href) {
        setError(t('post.error.noRedirect'))
        return
      }
      router.push(href)
      router.refresh()
    } catch {
      setError(t(existing ? 'post.error.saveOffline' : 'post.error.publishOffline'))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4">
      <div className="flex flex-col gap-4">
        <Plate>
          <PlateHeader>{t(existing ? 'post.section.what' : 'post.step.what')}</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => chooseType(entry.key)}
                  className={`label min-h-[70px] border-[2.5px] border-ink px-2 text-[15px] ${
                    type === entry.key ? 'bg-yellow' : 'bg-ground'
                  }`}
                >
                  {t(`post.type.${entry.key}`)}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('post.field.category')}</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">{t('post.field.categoryPlaceholder')}</option>
                {categories.map((parent) => (
                  <optgroup key={parent.id} label={categoryName(t, parent.slug, parent.name)}>
                    {parent.children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {categoryName(t, child.slug, child.name)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{t(existing ? 'post.section.details' : 'post.step.details')}</PlateHeader>
          <div className="flex flex-col gap-3.5 p-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('post.field.title')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={70}
                required
                placeholder={t('post.field.titlePlaceholder')}
              />
              <span className="text-xs font-semibold text-muted">
                {t('post.field.charsLeft', { count: 70 - title.length })}
              </span>
            </label>

            {leaf ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {leaf.attributes.map((def) => (
                  <AttributeInput key={def.key} def={def} value={attributes[def.key] ?? ''} onChange={setAttr} />
                ))}
              </div>
            ) : (
              <p className="label m-0 text-[16px] text-muted">{t('post.field.noCategory')}</p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="label text-[15px] text-muted">{t('post.field.description')}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                placeholder={t('post.field.descriptionPlaceholder')}
              />
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{t(existing ? 'post.section.photos' : 'post.step.photos')}</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <PhotoPicker
              listingId={existing?.id}
              initial={photos}
              enabled={photosEnabled}
              onPendingChange={setPendingPhotos}
            />
            <label className="flex flex-col gap-1">
              <span className="label text-[16px]">{t('post.field.video')}</span>
              <input
                type="url"
                inputMode="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={t('post.field.videoPlaceholder')}
                className="min-h-[48px] border-[2.5px] border-ink bg-ground px-3 text-[16px]"
              />
              <span className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
                {t('post.field.videoHelp')}
              </span>
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{t(existing ? 'post.section.price' : 'post.step.price')}</PlateHeader>
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
                  aria-label={t('post.field.price')}
                  placeholder={priceUnit === 'QUOTE' ? t('post.field.noPrice') : '0'}
                  className="!border-0 !bg-transparent !px-0 font-display text-[24px] text-red"
                />
              </div>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                aria-label={t('post.field.priceUnit')}
                className="w-[150px]"
              >
                {currentType.units.map((unit) => (
                  <option key={unit} value={unit}>
                    {t(`post.unit.${unit}`)}
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
              <span className="label text-[17px]">{t('post.field.negotiable')}</span>
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{t(existing ? 'post.section.location' : 'post.step.location')}</PlateHeader>
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
                aria-label={t('post.field.municipality')}
              >
                <option value="">{t('post.field.municipalityPlaceholder')}</option>
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
              placeholder={t('post.field.barangayPlaceholder')}
              aria-label={t('post.field.barangay')}
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
                {t('post.contact.edit')}
              </a>
            }
          >
            {t(existing ? 'post.section.contact' : 'post.step.contact')}
          </PlateHeader>
          <div className="flex flex-col gap-2 p-3.5">
            <p className="label m-0 text-[17px]">
              {reachableSummary.length > 0
                ? reachableSummary.join(' · ')
                : t('post.contact.trustclubOnly')}
            </p>
            {reachableSummary.length === 0 ? (
              <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
                {t('post.contact.help')}
              </p>
            ) : null}
          </div>
        </Plate>

        <div className="flex items-start gap-2.5 border-[3px] border-ink bg-green px-3.5 py-3">
          <p className="m-0 text-[13px] font-semibold leading-snug text-green-soft">
            {t('post.trustNote')}
          </p>
        </div>

        {publishedWithoutPhotos ? (
          <div className="flex flex-col gap-2 border-[3px] border-ink bg-yellow px-3.5 py-2.5">
            <p className="label m-0 text-[17px] text-ink">
              {t('post.publishedWithoutPhotos')}
            </p>
            <p className="m-0 text-[13px] font-semibold leading-snug text-ink">
              {publishedWithoutPhotos.message}
            </p>
            <Link href={publishedWithoutPhotos.href} className="label text-[16px] text-ink underline">
              {t('post.openListing')}
            </Link>
          </div>
        ) : null}
        {error ? (
          <p className="label m-0 border-[3px] border-ink bg-yellow px-3.5 py-2.5 text-[17px] text-ink">{error}</p>
        ) : null}
      </div>

      <div className="sticky bottom-0 mt-4 flex gap-2.5 border-t-4 border-ink bg-ground py-3">
        <Link
          href={cancelHref ?? '/'}
          className="label flex min-h-[54px] w-[112px] items-center justify-center border-[3px] border-ink bg-panel text-[18px] text-ink hover:text-ink"
        >
          {t('post.cancel')}
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="font-display hard flex min-h-[54px] flex-1 items-center justify-center gap-2.5 border-[3px] border-ink bg-red text-[21px] uppercase text-ground disabled:opacity-70"
        >
          {busy ? <Spinner /> : null}
          {busy
            ? progress
              ? t('post.uploadingPhoto', { number: progress.done + 1, total: progress.total })
              : t(existing ? 'post.saving' : 'post.publishing')
            : t(existing ? 'post.save' : 'post.publish')}
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
  const t = useT()
  const label = attributeLabel(t, def.key, def.label)

  if (def.type === 'enum') {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="label text-[15px] text-muted">{label}</span>
        <select value={value} onChange={(e) => onChange(def.key, e.target.value)} required={def.required}>
          <option value="">{t('post.field.choose')}</option>
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
        <span className="label text-[17px]">{label}</span>
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
          {label}
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
      <span className="label text-[15px] text-muted">{label}</span>
      <input value={value} maxLength={120} required={def.required} onChange={(e) => onChange(def.key, e.target.value)} />
    </label>
  )
}
