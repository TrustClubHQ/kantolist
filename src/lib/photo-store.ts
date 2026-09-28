import { put, del } from '@vercel/blob'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@/lib/logger'

/**
 * Where listing photos live.
 *
 * Vercel Blob in a deployment; the local filesystem in development, because a
 * Blob token is per-project and nobody should need one to try the posting flow
 * on their own machine. `ListingCard` already renders `/uploads/...` unoptimised
 * for exactly this.
 *
 * Whether uploads are possible at all is asked BEFORE the form offers them —
 * the same lesson as AUTH_SECRET, which showed a QR on a deployment that could
 * never finish a sign-in.
 */

const MAX_BYTES = 6 * 1024 * 1024
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

/** Local disk is only ever acceptable outside production. */
function localAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function photosEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || localAllowed()
}

export type UploadResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; error: string }

export async function storePhoto(file: File, listingCode: string): Promise<UploadResult> {
  const ext = ALLOWED.get(file.type)
  if (!ext) return { ok: false, error: 'Photos must be JPG, PNG or WebP' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Each photo must be 6MB or smaller' }
  if (file.size === 0) return { ok: false, error: 'That file was empty' }

  // Random, not the original filename: a name chosen by the uploader is both a
  // path-traversal surface and a way to overwrite someone else's photo.
  const name = `${listingCode}-${randomBytes(8).toString('hex')}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`listings/${name}`, bytes, {
        access: 'public',
        contentType: file.type,
      })
      return { ok: true, url: blob.url, bytes: file.size }
    } catch (e) {
      logger.error('[photos] blob upload failed', e instanceof Error ? e.message : String(e))
      return { ok: false, error: 'Could not store that photo' }
    }
  }

  if (!localAllowed()) return { ok: false, error: 'Photo storage is not set up on this deployment' }

  try {
    const dir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, name), bytes)
    return { ok: true, url: `/uploads/${name}`, bytes: file.size }
  } catch (e) {
    logger.error('[photos] local write failed', e instanceof Error ? e.message : String(e))
    return { ok: false, error: 'Could not store that photo' }
  }
}

/** Best effort: a listing row without its file is tidier than the reverse. */
export async function forgetPhoto(url: string): Promise<void> {
  try {
    if (url.startsWith('/uploads/')) {
      await unlink(path.join(process.cwd(), 'public', url.replace('/uploads/', 'uploads/')))
      return
    }
    if (process.env.BLOB_READ_WRITE_TOKEN) await del(url)
  } catch (e) {
    logger.error('[photos] delete failed', e instanceof Error ? e.message : String(e))
  }
}
