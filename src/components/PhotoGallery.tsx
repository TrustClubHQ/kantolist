'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import { useT } from '@/components/LanguageProvider'

export interface GalleryImage {
  id: string
  url: string
  width: number | null
  height: number | null
}

/**
 * The photos on a listing.
 *
 * Two things were wrong with what this replaces. The stage was a fixed 262px
 * band with `object-cover`, so a phone photo — nearly always portrait — was
 * shown as a thin horizontal slice of itself, which reads as stretched. And
 * only the first photo was ever rendered, under a "1 / 3" label that was a
 * static caption rather than a control, so the rest were unreachable.
 *
 * So: fit the photo instead of cropping it, size the stage to the first
 * photo's own shape where we know it, and put every photo one tap away.
 */

/** Clamped so neither a panorama nor a very tall portrait pushes the price
 *  and the location below the fold on a phone. */
const MIN_RATIO = 0.8 // 4:5, portrait
const MAX_RATIO = 1.9 // ~17:9, wide
/** Until the first photo has loaded and can report its own shape. */
const DEFAULT_RATIO = 4 / 3

function clampRatio(width: number, height: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height))
}

function stageRatio(first: GalleryImage | undefined): number | null {
  if (!first?.width || !first?.height) return null
  return clampRatio(first.width, first.height)
}

export function PhotoGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const t = useT()
  const [index, setIndex] = useState(0)
  // Full size, on top of everything. For a used item the photo is the whole
  // decision, and the stage is sized to keep the price above the fold — which
  // is the right trade until someone wants to look closely.
  const [zoomed, setZoomed] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  // Photos uploaded before the size was recorded have none stored, so the first
  // one reports its own on load rather than being letterboxed into the default.
  const [measured, setMeasured] = useState<number | null>(null)
  const ratio = stageRatio(images[0]) ?? measured ?? DEFAULT_RATIO
  const many = images.length > 1

  const go = useCallback(
    (to: number) => {
      const el = strip.current
      if (!el) return
      const next = Math.min(images.length - 1, Math.max(0, to))
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
      setIndex(next)
    },
    [images.length],
  )

  // The index follows the strip, not the buttons, so a swipe, an arrow click
  // and a keypress all end up agreeing about which photo is on screen.
  useEffect(() => {
    const el = strip.current
    if (!el) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth))
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="border-b-4 border-ink bg-dim lg:border-b-0">
      <div className="relative mx-auto w-full max-w-3xl">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ aspectRatio: String(ratio), maxHeight: 'min(72svh, 520px)' }}
          tabIndex={many ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(index + 1)
            if (e.key === 'ArrowLeft') go(index - 1)
          }}
          aria-roledescription={many ? 'carousel' : undefined}
          aria-label={many ? t('listing.photoCount', { count: images.length, title }) : undefined}
        >
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setZoomed(i)}
              aria-label={t('photo.open', { number: i + 1 })}
              className="relative h-full w-full shrink-0 snap-center"
            >
              <Image
                src={image.url}
                alt={i === 0 ? title : t('listing.photoOf', { title, number: i + 1 })}
                fill
                sizes="(max-width: 900px) 100vw, 768px"
                className="object-contain"
                priority={i === 0}
                onLoad={
                  i === 0
                    ? (e) => {
                        const img = e.currentTarget
                        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                          setMeasured(clampRatio(img.naturalWidth, img.naturalHeight))
                        }
                      }
                    : undefined
                }
              />
            </button>
          ))}
        </div>

        {many ? (
          <>
            <span className="label pointer-events-none absolute bottom-2 right-2 bg-ink px-2.5 py-0.5 text-[14px] text-ground">
              {index + 1} / {images.length}
            </span>
            {/* Shown from the small breakpoint up: on a phone the thumbnails
                below and the swipe already do this, and an arrow sitting on
                top of the photo would cover part of it. */}
            <Arrow
              side="left"
              label={t('listing.photoPrevious')}
              disabled={index === 0}
              onClick={() => go(index - 1)}
            />
            <Arrow
              side="right"
              label={t('listing.photoNext')}
              disabled={index === images.length - 1}
              onClick={() => go(index + 1)}
            />
          </>
        ) : null}
      </div>

      {zoomed !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,19,14,0.92)] p-3"
          role="dialog"
          aria-modal="true"
          aria-label={t('photo.open', { number: zoomed + 1 })}
          onClick={() => setZoomed(null)}
        >
          <Image
            src={images[zoomed].url}
            alt={t('listing.photoOf', { title, number: zoomed + 1 })}
            fill
            sizes="100vw"
            className="object-contain p-3"
          />
          <button
            type="button"
            onClick={() => setZoomed(null)}
            aria-label={t('photo.close')}
            className="label absolute right-3 top-3 z-10 flex h-[44px] w-[44px] items-center justify-center border-[3px] border-ground bg-ink text-[20px] text-ground"
          >
            ✕
          </button>
          {many ? (
            <span className="label absolute bottom-4 left-1/2 z-10 -translate-x-1/2 bg-ink px-2.5 py-0.5 text-[15px] text-ground">
              {zoomed + 1} / {images.length}
            </span>
          ) : null}
        </div>
      ) : null}

      {many ? (
        <div className="mx-auto w-full max-w-3xl border-t-4 border-ink bg-panel">
          <div className="flex gap-2 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t('listing.photoShow', { number: i + 1 })}
                aria-current={i === index}
                className={`relative h-[54px] w-[54px] shrink-0 border-[3px] sm:h-[60px] sm:w-[60px] ${
                  i === index ? 'border-red' : 'border-ink opacity-70'
                }`}
              >
                <Image src={image.url} alt="" fill sizes="60px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Arrow({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`font-display absolute top-1/2 hidden h-[48px] w-[40px] -translate-y-1/2 items-center justify-center border-[3px] border-ink bg-ground text-[22px] text-ink disabled:opacity-40 sm:flex ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  )
}
