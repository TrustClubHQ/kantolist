'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Spinner } from '@/components/ui'
import { useT } from '@/components/LanguageProvider'

export interface ListingPhoto {
  id: string
  url: string
}

/**
 * Phone photos are far bigger than a listing page can use: a 12MP shot is
 * 4000px wide and several megabytes, and it travels over the kind of mobile
 * connection this site is built for. So each one is scaled down in the browser
 * before it is sent — which also keeps uploads under the 4.5MB a serverless
 * request can carry, where a straight-from-the-camera photo would be refused
 * by the platform before our own size check ever ran.
 */
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82
/** Below this a photo is already small enough that re-encoding only loses detail. */
const LEAVE_ALONE_BYTES = 600 * 1024

export interface PreparedPhoto {
  file: File
  width: number | null
  height: number | null
}

function canvasFor(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
}

/**
 * Never throws and never refuses: a browser that cannot decode the file, or
 * produces something larger than what it started with, sends the original. A
 * photo the seller picked should not go missing because the resize did not work.
 */
export async function prepareForUpload(file: File): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { file, width: null, height: null }
  }

  const { width, height } = bitmap
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  if (scale === 1 && file.size <= LEAVE_ALONE_BYTES) {
    bitmap.close()
    return { file, width, height }
  }

  const target = { width: Math.round(width * scale), height: Math.round(height * scale) }
  try {
    const canvas = canvasFor(target.width, target.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    // A transparent PNG becomes white rather than black, which is what JPEG
    // gives you for an unpainted canvas.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, target.width, target.height)
    ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    const blob = await toBlob(canvas)
    if (!blob || blob.size >= file.size) return { file, width, height }
    const name = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return {
      file: new File([blob], `${name}.jpg`, { type: 'image/jpeg' }),
      width: target.width,
      height: target.height,
    }
  } catch {
    return { file, width, height }
  } finally {
    bitmap.close()
  }
}

/**
 * The upload body: the scaled photo, plus its pixel size so the listing page
 * can size its stage to the photo's shape instead of cropping it into a fixed
 * band. The size is only ever a layout hint, and the server clamps it.
 */
async function photoForm(file: File): Promise<FormData> {
  const prepared = await prepareForUpload(file)
  const body = new FormData()
  body.append('photo', prepared.file)
  if (prepared.width && prepared.height) {
    body.append('width', String(prepared.width))
    body.append('height', String(prepared.height))
  }
  return body
}

/**
 * Photos on a listing.
 *
 * Two modes, because a new listing has no id to attach anything to yet:
 *  - editing: each pick uploads immediately against the listing
 *  - posting: picks are held and handed back, and the page uploads them once
 *    the listing exists (see `uploadPendingPhotos`)
 *
 * When storage is not configured the control is not offered at all. Showing a
 * file picker that cannot keep the file is the same mistake as the QR on a
 * deployment that could not finish a sign-in.
 */
export function PhotoPicker({
  listingId,
  initial = [],
  enabled,
  onPendingChange,
  max = 8,
}: {
  listingId?: string
  initial?: ListingPhoto[]
  enabled: boolean
  /** Posting mode: the files to upload once the listing has been created. */
  onPendingChange?: (files: File[]) => void
  max?: number
}) {
  const t = useT()
  const [photos, setPhotos] = useState<ListingPhoto[]>(initial)
  const [pending, setPending] = useState<{ file: File; preview: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const total = photos.length + pending.length

  if (!enabled) {
    return (
      <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
        {t('post.photos.disabled')}
      </p>
    )
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const room = max - total
    const chosen = Array.from(files).slice(0, Math.max(0, room))
    if (chosen.length === 0) {
      setError(t('post.photos.max', { max }))
      return
    }

    if (!listingId) {
      const next = [...pending, ...chosen.map((file) => ({ file, preview: URL.createObjectURL(file) }))]
      setPending(next)
      onPendingChange?.(next.map((p) => p.file))
      return
    }

    setBusy(true)
    try {
      for (const file of chosen) {
        const res = await fetch(`/api/listings/${listingId}/photos`, {
          method: 'POST',
          body: await photoForm(file),
        })
        const data: { id?: string; url?: string; error?: string } = await res.json()
        if (!res.ok || !data.id || !data.url) {
          setError(data.error ?? t('post.photos.failed'))
          break
        }
        setPhotos((p) => [...p, { id: data.id!, url: data.url! }])
      }
    } catch {
      setError(t('post.photos.offline'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove(photo: ListingPhoto) {
    if (!listingId) return
    setError(null)
    const res = await fetch(`/api/listings/${listingId}/photos?imageId=${encodeURIComponent(photo.id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      setError(t('post.photos.removeFailed'))
      return
    }
    setPhotos((p) => p.filter((x) => x.id !== photo.id))
  }

  function removePending(index: number) {
    const next = pending.filter((_, i) => i !== index)
    URL.revokeObjectURL(pending[index].preview)
    setPending(next)
    onPendingChange?.(next.map((p) => p.file))
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <figure key={photo.id} className="relative m-0 h-[84px] w-[84px] border-[2.5px] border-ink">
            <Image src={photo.url} alt="" fill sizes="84px" className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => remove(photo)}
              aria-label={t('post.photos.remove')}
              className="label absolute right-0 top-0 flex h-[26px] w-[26px] items-center justify-center border-l-2 border-b-2 border-ink bg-ground text-[15px]"
            >
              ✕
            </button>
          </figure>
        ))}
        {pending.map((p, i) => (
          <figure key={p.preview} className="relative m-0 h-[84px] w-[84px] border-[2.5px] border-dim-edge">
            {/* Not yet uploaded — a local preview, so plain img rather than next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="h-full w-full object-cover opacity-80" />
            <button
              type="button"
              onClick={() => removePending(i)}
              aria-label={t('post.photos.remove')}
              className="label absolute right-0 top-0 flex h-[26px] w-[26px] items-center justify-center border-l-2 border-b-2 border-ink bg-ground text-[15px]"
            >
              ✕
            </button>
          </figure>
        ))}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy || total >= max}
        onClick={() => input.current?.click()}
        className="label flex min-h-[48px] items-center justify-center gap-2 border-[2.5px] border-ink bg-panel px-3 text-[17px] disabled:opacity-70"
      >
        {busy ? <Spinner className="h-[16px] w-[16px]" /> : null}
        {busy
          ? t('post.photos.adding')
          : total === 0
            ? t('post.photos.add')
            : t('post.photos.addMore', { count: total, max })}
      </button>

      {!listingId && pending.length > 0 ? (
        <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
          {t('post.photos.pending')}
        </p>
      ) : null}
      {error ? (
        <p className="label m-0 border-2 border-ink bg-yellow px-3 py-2 text-[16px] text-ink">{error}</p>
      ) : null}
    </div>
  )
}

/**
 * Posting mode: attach the held files once the listing exists.
 *
 * Never throws — the listing is already published and must not be lost to a
 * photo — but it does report. Swallowing the failure entirely is what made a
 * misconfigured Blob store look like the photo simply "not showing", with
 * nothing on screen to explain it and nothing to act on.
 */
export async function uploadPendingPhotos(
  listingId: string,
  files: File[],
  /** Called before each photo goes up, so the button can count them off. */
  onProgress?: (done: number, total: number) => void,
): Promise<{ failed: number; error?: string }> {
  let failed = 0
  let error: string | undefined
  for (const [index, file] of files.entries()) {
    onProgress?.(index, files.length)
    try {
      const res = await fetch(`/api/listings/${listingId}/photos`, {
        method: 'POST',
        body: await photoForm(file),
      })
      if (!res.ok) {
        failed += 1
        const data: { error?: string } = await res.json().catch(() => ({}))
        error ??= data.error
      }
    } catch {
      failed += 1
      error ??= 'Could not reach the server'
    }
  }
  return { failed, error }
}
