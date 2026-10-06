'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AttributeDef } from '@/lib/attributes'
import { Plate, PlateHeader, Spinner } from '@/components/ui'
import { useT } from '@/components/LanguageProvider'
import { attributeLabel, categoryExample, categoryName } from '@/lib/i18n'
import { listingPath, parseVideoUrl, pastedSiteName, videoHostName } from '@/lib/listing'
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
  /**
   * The seller's contact details, as this form currently understands them.
   *
   * Local state rather than the prop, because the prop is a server render from
   * when the page loaded. Sending someone to their profile in another tab and
   * telling them to come back left this stale: they filled the number in, came
   * back, and the publish button went on refusing with no way to clear it
   * short of reloading and losing the form. They are editable here now, and
   * this is what the save writes back to.
   */
  const [reach, setReach] = useState({
    phone: contact.phone,
    messenger: contact.messenger,
    viber: contact.viber,
  })

  const channels = useMemo(() => {
    const on: string[] = []
    if (reach.phone) on.push('PHONE', 'SMS')
    if (reach.messenger) on.push('MESSENGER')
    if (reach.viber) on.push('VIBER')
    return on
  }, [reach])

  /**
   * A listing nobody can answer is worse than no listing, so a number or a
   * Messenger handle is the floor for posting at all. A TrustClub profile is
   * an identity rather than an inbox and a Facebook page is a detour, so
   * neither counts. Viber does not count on its own either: a buyer without
   * the app would have nothing to tap.
   *
   * The API enforces the same rule — this only saves the round trip and says
   * where to fix it.
   */
  const canBeReached = !!reach.phone || !!reach.messenger

  const [phoneDraft, setPhoneDraft] = useState(contact.phone ?? '')
  const [messengerDraft, setMessengerDraft] = useState(contact.messenger ?? '')
  const [contactOpen, setContactOpen] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [contactSaved, setContactSaved] = useState(false)
  // Open on its own when there is nothing to reach this seller on: that is the
  // one case where the form cannot be finished without it.
  const contactEditing = contactOpen || !canBeReached

  /**
   * Pick up contact details changed somewhere else.
   *
   * The section header still links to the full profile — Viber, display name,
   * town — and that opens in another tab, which is how this form went stale in
   * the first place. Re-reading when the tab is looked at again means coming
   * back from any of those routes just works, instead of a publish button that
   * refuses for a reason that is no longer true.
   */
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible') return
      fetch('/api/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { account?: { phone: string | null; messengerHandle: string | null; viberNumber: string | null } } | null) => {
          const a = data?.account
          if (!a) return
          setReach((r) =>
            r.phone === a.phone && r.messenger === a.messengerHandle && r.viber === a.viberNumber
              ? r
              : { phone: a.phone, messenger: a.messengerHandle, viber: a.viberNumber },
          )
        })
        .catch(() => {
          // Offline, or signed out in the other tab. The form keeps what it
          // has; publishing is still checked by the API either way.
        })
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  /**
   * The video box answers while it is being filled in, not at publish time.
   *
   * Waiting for the first press of Publish meant a seller pasted a link,
   * carried on filling in the rest of the form, and only found out at the end
   * — by which point the message was about a box several screens up. Checked
   * here as soon as they stop typing instead, and it says the site's name back
   * when the link is one we take, so a good paste is visibly good rather than
   * merely not complained about.
   *
   * Half a second of quiet first: a URL typed by hand is invalid for most of
   * the time it is being typed, and flashing red at every keystroke would be
   * the form arguing with someone who is not finished yet. A paste arrives in
   * one go, so it still feels immediate.
   */
  const [videoNotice, setVideoNotice] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    if (!videoUrl.trim()) {
      setVideoNotice(null)
      return
    }
    const timer = setTimeout(() => {
      const parsed = parseVideoUrl(videoUrl)
      if ('error' in parsed) {
        const site = pastedSiteName(videoUrl)
        setVideoNotice({
          ok: false,
          text: site ? t('post.invalid.videoSite', { site }) : t('post.invalid.video'),
        })
        return
      }
      const host = parsed.url ? videoHostName(parsed.url) : null
      setVideoNotice(host ? { ok: true, text: t('post.field.videoOk', { site: host }) } : null)
    }, 500)
    return () => clearTimeout(timer)
  }, [videoUrl, t])

  async function saveContact() {
    const phone = phoneDraft.trim()
    const messenger = messengerDraft.trim()
    if (!phone && !messenger) {
      setContactError(t('post.contact.oneNeeded'))
      return
    }
    setSavingContact(true)
    setContactError(null)
    setContactSaved(false)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone || null, messengerHandle: messenger || null }),
      })
      const data: { error?: string; account?: { phone: string | null; messengerHandle: string | null } } =
        await res.json().catch(() => ({}))
      if (!res.ok) {
        setContactError(data.error ?? t('post.contact.saveFailed'))
        return
      }
      // What the server stored, not what was typed: the number comes back
      // normalised and the handle without its @.
      const saved = data.account
      setReach((r) => ({ ...r, phone: saved?.phone ?? phone, messenger: saved?.messengerHandle ?? messenger }))
      setPhoneDraft(saved?.phone ?? phone)
      setMessengerDraft(saved?.messengerHandle ?? messenger)
      setContactSaved(true)
      setContactOpen(false)
    } catch {
      setContactError(t('post.contact.saveOffline'))
    } finally {
      setSavingContact(false)
    }
  }

  const reachableSummary = useMemo(() => {
    const parts: string[] = []
    if (reach.phone) parts.push(t('post.contact.call', { phone: reach.phone }))
    if (reach.messenger) parts.push(t('post.contact.messenger', { handle: reach.messenger }))
    if (reach.viber) parts.push(t('post.contact.viber', { number: reach.viber }))
    return parts
  }, [reach, t])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // What the button says while it works. Publishing is several round trips —
  // the listing, then a photo at a time — and counting them off is the
  // difference between "working" and "stuck".
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [restored, setRestored] = useState(false)
  const [publishedWithoutPhotos, setPublishedWithoutPhotos] = useState<{
    href: string
    message: string
  } | null>(null)

  const currentType = TYPES.find((entry) => entry.key === type)!
  /**
   * A half-written listing survives a closed tab.
   *
   * This form is long, it is filled in on a phone, and section 6 links out to
   * the profile — so leaving it in the middle is normal, not an accident.
   * Photos are not kept: a File cannot go into localStorage, and silently
   * dropping them would be worse than asking for them again.
   */
  const draftKey = 'kantolist:draft'
  const draft = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (existing) return
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, string | boolean | Record<string, string>>
      if (typeof saved.title === 'string' && saved.title) setTitle(saved.title)
      if (typeof saved.description === 'string') setDescription(saved.description)
      if (typeof saved.type === 'string') setType(saved.type as TypeKey)
      if (typeof saved.categoryId === 'string') setCategoryId(saved.categoryId)
      if (typeof saved.price === 'string') setPrice(saved.price)
      if (typeof saved.priceUnit === 'string') setPriceUnit(saved.priceUnit)
      if (typeof saved.negotiable === 'boolean') setNegotiable(saved.negotiable)
      if (typeof saved.barangay === 'string') setBarangay(saved.barangay)
      if (typeof saved.videoUrl === 'string') setVideoUrl(saved.videoUrl)
      if (saved.attributes && typeof saved.attributes === 'object') {
        setAttributes(saved.attributes as Record<string, string>)
      }
      // Only say so when there was something worth keeping.
      if (saved.title || saved.description) setRestored(true)
    } catch {
      // A corrupt or unreadable draft is not worth a message; the form is
      // already usable and empty.
    }
  }, [existing])

  useEffect(() => {
    if (existing) return
    draft.current = {
      type, categoryId, title, description, price, priceUnit, negotiable, barangay, videoUrl, attributes,
    }
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(draft.current))
      } catch {
        // Private mode, or a full quota. The form still works.
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [existing, type, categoryId, title, description, price, priceUnit, negotiable, barangay, videoUrl, attributes])

  function discardDraft() {
    try {
      window.localStorage.removeItem(draftKey)
    } catch {
      // Nothing to do: the next publish clears it anyway.
    }
  }

  const leaf = useMemo(
    () => categories.flatMap((c) => c.children).find((c) => c.id === categoryId),
    [categories, categoryId],
  )

  /**
   * Validation we do ourselves, rather than leaving to `required`.
   *
   * The native bubble was the only thing saying why publishing did nothing,
   * and it is the wrong tool here: it is always in the browser's language
   * rather than the one the reader picked, it vanishes on its own, iOS Safari
   * draws nothing at all, and it cannot say the useful part — that a seller
   * whose thing fits no subcategory should pick "Other". So the form carries
   * `noValidate` and the messages live in the page, next to the box.
   */
  const formRef = useRef<HTMLFormElement>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [attempted, setAttempted] = useState(false)

  const problems = useMemo(() => {
    const found: Record<string, string> = {}
    if (!categoryId) found.category = t('post.invalid.category')
    if (!title.trim()) found.title = t('post.invalid.title')
    if (priceUnit !== 'QUOTE' && !price.trim()) found.price = t('post.invalid.price')
    if (!municipalityId) found.municipality = t('post.invalid.municipality')
    if (!canBeReached) found.contact = t('post.invalid.contact')
    // Checked here as well as on the server, because the server's refusal
    // arrives as one line at the far end of a long form and says nothing about
    // which box caused it. A seller pasting a link that is not accepted needs
    // the message next to the link.
    if ('error' in parseVideoUrl(videoUrl)) {
      // Name the site they pasted. "Use YouTube, Facebook or TikTok" alone
      // tells someone looking at an Instagram link what they could have done,
      // not what is wrong with what they did.
      const site = pastedSiteName(videoUrl)
      found.video = site ? t('post.invalid.videoSite', { site }) : t('post.invalid.video')
    }
    for (const def of leaf?.attributes ?? []) {
      if (!def.required) continue
      if (!(attributes[def.key] ?? '').trim()) {
        found[`attr:${def.key}`] = t('post.invalid.attribute', {
          field: attributeLabel(t, def.key, def.label),
        })
      }
    }
    return found
  }, [t, categoryId, title, price, priceUnit, municipalityId, leaf, attributes, canBeReached, videoUrl])

  // Once publishing has been attempted, the messages track what is still
  // missing — a box that gets filled in stops complaining without a re-submit.
  useEffect(() => {
    if (attempted) setFieldErrors(problems)
  }, [attempted, problems])

  /**
   * Jump to the first box that still needs an answer.
   *
   * In an effect rather than inline in the submit handler: the handler runs
   * before React has rendered `data-invalid`, so querying the DOM there finds
   * nothing and the page sits where it was — which is the "the button does
   * nothing" complaint all over again, just with our own markup.
   */
  const [jumpTick, setJumpTick] = useState(0)
  useEffect(() => {
    if (jumpTick === 0) return
    const first = formRef.current?.querySelector<HTMLElement>('[data-invalid="true"]')
    if (!first) return
    // Centred, not top-aligned: the first box would otherwise land under the
    // site header.
    first.scrollIntoView({ block: 'center', behavior: 'smooth' })
    first.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true })
  }, [jumpTick])

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
    setAttempted(true)
    const found = problems
    setFieldErrors(found)
    const count = Object.keys(found).length
    if (count > 0) {
      setError(count === 1 ? t('post.invalid.summaryOne') : t('post.invalid.summary', { count }))
      setJumpTick((n) => n + 1)
      return
    }
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

      if (!existing) discardDraft()

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
    <form ref={formRef} noValidate onSubmit={submit} className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4">
      <div className="flex flex-col gap-4">
        {restored ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-[3px] border-ink bg-yellow px-3.5 py-2.5">
            <p className="label m-0 text-[16px] text-ink">{t('post.draftKept')}</p>
            <button
              type="button"
              onClick={() => {
                discardDraft()
                window.location.reload()
              }}
              className="label min-h-[40px] border-[2.5px] border-ink bg-ground px-3 text-[15px]"
            >
              {t('post.draftDiscard')}
            </button>
          </div>
        ) : null}
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
            <label className="flex flex-col gap-1.5" data-invalid={!!fieldErrors.category}>
              <span className="label text-[15px] text-muted">{t('post.field.category')}</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-invalid={!!fieldErrors.category}
                className={fieldErrors.category ? '!border-red' : undefined}
              >
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
              <FieldError message={fieldErrors.category} />
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{t(existing ? 'post.section.details' : 'post.step.details')}</PlateHeader>
          <div className="flex flex-col gap-3.5 p-3.5">
            <label className="flex flex-col gap-1.5" data-invalid={!!fieldErrors.title}>
              <span className="label text-[15px] text-muted">{t('post.field.title')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={70}
                aria-invalid={!!fieldErrors.title}
                className={fieldErrors.title ? '!border-red' : undefined}
                placeholder={categoryExample(t, leaf?.slug)}
              />
              <FieldError message={fieldErrors.title} />
              <span className="text-xs font-semibold text-muted">
                {t('post.field.charsLeft', { count: 70 - title.length })}
              </span>
            </label>

            {leaf ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {leaf.attributes.map((def) => (
                  <AttributeInput
                    key={def.key}
                    def={def}
                    value={attributes[def.key] ?? ''}
                    onChange={setAttr}
                    error={fieldErrors[`attr:${def.key}`]}
                  />
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
            <label className="flex flex-col gap-1" data-invalid={!!fieldErrors.video}>
              <span className="label text-[16px]">{t('post.field.video')}</span>
              <input
                type="url"
                inputMode="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={t('post.field.videoPlaceholder')}
                aria-invalid={videoNotice?.ok === false || !!fieldErrors.video}
                className={`min-h-[48px] border-[2.5px] bg-ground px-3 text-[16px] ${
                  videoNotice?.ok === false || fieldErrors.video
                    ? 'border-red'
                    : videoNotice?.ok
                      ? 'border-green'
                      : 'border-ink'
                }`}
              />
              {videoNotice ? (
                <span
                  role={videoNotice.ok ? undefined : 'alert'}
                  className={`m-0 text-[13px] font-semibold leading-snug ${
                    videoNotice.ok ? 'text-green' : 'text-red'
                  }`}
                >
                  {videoNotice.text}
                </span>
              ) : (
                <FieldError message={fieldErrors.video} />
              )}
              <span className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
                {t('post.field.videoHelp')}
              </span>
            </label>
          </div>
        </Plate>

        <Plate>
          <PlateHeader>{t(existing ? 'post.section.price' : 'post.step.price')}</PlateHeader>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex gap-2.5" data-invalid={!!fieldErrors.price}>
              <div
                className={`flex flex-1 items-center gap-2 border-[2.5px] bg-ground px-3 ${
                  fieldErrors.price ? 'border-red' : 'border-ink'
                }`}
              >
                <span className="font-display text-[21px] text-muted">₱</span>
                <input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                  disabled={priceUnit === 'QUOTE'}
                  aria-invalid={!!fieldErrors.price}
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
            <FieldError message={fieldErrors.price} />
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
              <div className="flex flex-col gap-1.5" data-invalid={!!fieldErrors.municipality}>
                <select
                  value={municipalityId}
                  onChange={(e) => setMunicipalityId(e.target.value)}
                  aria-invalid={!!fieldErrors.municipality}
                  aria-label={t('post.field.municipality')}
                  className={fieldErrors.municipality ? '!border-red' : undefined}
                >
                  <option value="">{t('post.field.municipalityPlaceholder')}</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}, {m.province}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.municipality} />
              </div>
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
          <div className="flex flex-col gap-2 p-3.5" data-invalid={!!fieldErrors.contact}>
            {canBeReached ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="label m-0 text-[17px]">{reachableSummary.join(' · ')}</p>
                {!contactEditing ? (
                  <button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className="label min-h-[44px] border-[2.5px] border-ink bg-ground px-3 text-[15px]"
                  >
                    {t('post.contact.change')}
                  </button>
                ) : null}
              </div>
            ) : (
              /* Not a warning tucked under a summary: with nothing here the
                 listing cannot be published at all, so it says so. */
              <>
                <p className="label m-0 text-[17px] text-red">{t('post.contact.required')}</p>
                <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
                  {t('post.contact.requiredHelp')}
                </p>
              </>
            )}

            {/* Filled in here rather than on the profile screen. Sending
                someone away mid-form meant coming back to a page that had
                not noticed, and a publish button that still refused. */}
            {contactEditing ? (
              <div className="mt-1 flex flex-col gap-3 border-[2.5px] border-ink bg-panel p-3">
                <label className="flex flex-col gap-1.5">
                  <span className="label text-[15px] text-muted">{t('profile.phone')}</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder={t('profile.phonePlaceholder')}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="label text-[15px] text-muted">{t('profile.messenger')}</span>
                  <input
                    value={messengerDraft}
                    onChange={(e) => setMessengerDraft(e.target.value)}
                    placeholder={t('profile.messengerPlaceholder')}
                  />
                  <span className="text-xs font-semibold text-muted">{t('profile.messengerHelp')}</span>
                </label>
                <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
                  {t('post.contact.editHelp')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingContact}
                    onClick={saveContact}
                    className="label hard-sm flex min-h-[46px] flex-1 items-center justify-center gap-2 border-[3px] border-ink bg-yellow px-3.5 text-[17px] text-ink disabled:opacity-70"
                  >
                    {savingContact ? <Spinner /> : null}
                    {savingContact ? t('post.contact.saving') : t('post.contact.save')}
                  </button>
                  {canBeReached ? (
                    <button
                      type="button"
                      disabled={savingContact}
                      onClick={() => {
                        setContactOpen(false)
                        setContactError(null)
                        setPhoneDraft(reach.phone ?? '')
                        setMessengerDraft(reach.messenger ?? '')
                      }}
                      className="label min-h-[46px] border-[2.5px] border-ink bg-ground px-3.5 text-[15px]"
                    >
                      {t('post.contact.cancel')}
                    </button>
                  ) : null}
                </div>
                {contactError ? (
                  <p role="alert" className="m-0 text-[13px] font-semibold leading-snug text-red">
                    {contactError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {contactSaved && !contactEditing ? (
              <p className="m-0 text-[13px] font-semibold leading-snug text-green">
                {t('post.contact.saved')}
              </p>
            ) : null}
            {/* No FieldError here: this section states the requirement in red
                whether or not publishing has been tried, so repeating it on
                submit only says the same sentence twice. `data-invalid` still
                brings the jump here, and the summary still counts it. */}
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


/**
 * The message under a box that still needs an answer.
 *
 * `role="alert"` so a screen reader hears it when it appears, since the only
 * other announcement of a failed publish is the summary at the far end of a
 * long form.
 */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span role="alert" className="m-0 text-[13px] font-semibold leading-snug text-red">
      {message}
    </span>
  )
}

function AttributeInput({
  def,
  value,
  onChange,
  error,
}: {
  def: AttributeDef
  value: string
  onChange: (key: string, value: string) => void
  error?: string
}) {
  const t = useT()
  const label = attributeLabel(t, def.key, def.label)
  const ring = error ? '!border-red' : undefined

  if (def.type === 'enum') {
    return (
      <label className="flex flex-col gap-1.5" data-invalid={!!error}>
        <span className="label text-[15px] text-muted">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(def.key, e.target.value)}
          aria-invalid={!!error}
          className={ring}
        >
          <option value="">{t('post.field.choose')}</option>
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <FieldError message={error} />
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
      <label className="flex flex-col gap-1.5" data-invalid={!!error}>
        <span className="label text-[15px] text-muted">
          {label}
          {def.unit ? ` (${def.unit})` : ''}
        </span>
        <input
          inputMode="numeric"
          value={value}
          min={def.min}
          max={def.max}
          aria-invalid={!!error}
          className={ring}
          onChange={(e) => onChange(def.key, e.target.value.replace(/\D/g, ''))}
        />
        <FieldError message={error} />
      </label>
    )
  }

  return (
    <label className="flex flex-col gap-1.5" data-invalid={!!error}>
      <span className="label text-[15px] text-muted">{label}</span>
      <input
        value={value}
        maxLength={120}
        aria-invalid={!!error}
        className={ring}
        onChange={(e) => onChange(def.key, e.target.value)}
      />
      <FieldError message={error} />
    </label>
  )
}
