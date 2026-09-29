'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

export interface ListingPhoto {
  id: string
  url: string
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
/**
 * The photo's own pixel size, sent with the upload so the listing page can size
 * its stage to the photo's shape instead of cropping it into a fixed band. Only
 * ever a layout hint — the server clamps it — so reading it in the browser is
 * cheaper than decoding the file again on the way in.
 */
async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size.width > 0 && size.height > 0 ? size : null
  } catch {
    return null
  }
}

async function photoForm(file: File): Promise<FormData> {
  const body = new FormData()
  body.append('photo', file)
  const size = await readDimensions(file)
  if (size) {
    body.append('width', String(size.width))
    body.append('height', String(size.height))
  }
  return body
}

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
  const [photos, setPhotos] = useState<ListingPhoto[]>(initial)
  const [pending, setPending] = useState<{ file: File; preview: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const total = photos.length + pending.length

  if (!enabled) {
    return (
      <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
        Photo storage is not set up on this deployment yet, so listings cannot carry pictures.
      </p>
    )
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const room = max - total
    const chosen = Array.from(files).slice(0, Math.max(0, room))
    if (chosen.length === 0) {
      setError(`A listing can have up to ${max} photos`)
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
          setError(data.error ?? 'Could not add that photo')
          break
        }
        setPhotos((p) => [...p, { id: data.id!, url: data.url! }])
      }
    } catch {
      setError('Could not upload. Check your connection and try again.')
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
      setError('Could not remove that photo')
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
              aria-label="Remove photo"
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
              aria-label="Remove photo"
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
        className="label min-h-[48px] border-[2.5px] border-ink bg-panel px-3 text-[17px] disabled:opacity-60"
      >
        {busy ? 'Adding…' : total === 0 ? 'Add photos' : `Add more (${total}/${max})`}
      </button>

      {!listingId && pending.length > 0 ? (
        <p className="m-0 text-[13px] font-semibold leading-snug text-muted-2">
          These upload once the listing is published.
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
): Promise<{ failed: number; error?: string }> {
  let failed = 0
  let error: string | undefined
  for (const file of files) {
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
